import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";

import { fetchSourceStores, syncStores } from "./store-sync";

const validSourceRecord = {
  city: " Burnsville ",
  latitude: 44.75,
  longitude: -93.295,
  name: " Burnsville ",
  state: " mn ",
  store_id: 1087,
  street: " 14050 Burnhaven Dr ",
  zip: " 55337-4407 ",
};

describe("fetchSourceStores", () => {
  it("normalizes the upstream payload into DB-ready store records", async () => {
    const sourceStores = await fetchSourceStores({
      fetchFn: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify([validSourceRecord]), { status: 200 })
        ),
      sourceUrl: "https://example.com/costco.json",
    });

    expect(sourceStores).toEqual([
      {
        active: true,
        address: "14050 Burnhaven Dr",
        city: "Burnsville",
        external_id: "1087",
        lat: "44.75",
        lng: "-93.295",
        name: "Burnsville",
        state: "MN",
        zip: "55337-4407",
      },
    ]);
  });

  it("rejects malformed upstream records with a validation error", async () => {
    await expect(
      fetchSourceStores({
        fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
          new Response(
            JSON.stringify([
              {
                ...validSourceRecord,
                latitude: 120,
              },
            ]),
            { status: 200 }
          )
        ),
        sourceUrl: "https://example.com/costco.json",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION_FAILED",
        details: expect.objectContaining({
          field: "latitude",
          index: 0,
          value: 120,
        }),
      })
    );
  });

  it("rejects duplicate store IDs from the upstream payload", async () => {
    await expect(
      fetchSourceStores({
        fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
          new Response(
            JSON.stringify([
              validSourceRecord,
              {
                ...validSourceRecord,
                name: "Another Burnsville",
              },
            ]),
            { status: 200 }
          )
        ),
        sourceUrl: "https://example.com/costco.json",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "DUPLICATE_EXTERNAL_ID",
      })
    );
  });

  it("wraps fetch failures in a structured sync error", async () => {
    await expect(
      fetchSourceStores({
        fetchFn: vi.fn<typeof fetch>().mockRejectedValue(new Error("boom")),
        sourceUrl: "https://example.com/costco.json",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "FETCH_FAILED",
      })
    );
  });
});

describe("syncStores", () => {
  it("inserts, updates, reactivates, and soft-deactivates stores based on source changes", async () => {
    const insertValues: Record<string, unknown>[] = [];
    const updateValues: Record<string, unknown>[] = [];
    const db = createMockDb(
      [
        createExistingStore({
          active: true,
          external_id: "2000",
          id: 2,
          name: "Old Store Name",
        }),
        createExistingStore({
          active: false,
          external_id: "3000",
          id: 3,
        }),
        createExistingStore({
          active: true,
          external_id: "5000",
          id: 4,
          name: "Missing Store",
        }),
      ],
      insertValues,
      updateValues
    );

    const summary = await syncStores({
      db,
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              ...validSourceRecord,
              city: "Updated City",
              name: "Updated Store",
              store_id: 2000,
              street: "500 Updated Ave",
            },
            {
              ...validSourceRecord,
              name: "Reactivated Store",
              store_id: 3000,
            },
            {
              ...validSourceRecord,
              name: "New Store",
              store_id: 4000,
            },
          ]),
          { status: 200 }
        )
      ),
    });

    expect(summary).toEqual({
      deactivated: 1,
      inserted: 1,
      reactivated: 1,
      unchanged: 0,
      updated: 1,
    });
    expect(insertValues).toEqual([
      expect.objectContaining({
        active: true,
        external_id: "4000",
        name: "New Store",
      }),
    ]);
    expect(updateValues).toEqual([
      expect.objectContaining({
        active: true,
        address: "500 Updated Ave",
        city: "Updated City",
        external_id: "2000",
        name: "Updated Store",
      }),
      expect.objectContaining({
        active: true,
        external_id: "3000",
        name: "Reactivated Store",
      }),
      {
        active: false,
      },
    ]);
  });

  it("does not write when the upstream data is unchanged", async () => {
    const insertValues: Record<string, unknown>[] = [];
    const updateValues: Record<string, unknown>[] = [];
    const db = createMockDb(
      [
        createExistingStore({
          active: true,
          id: 1,
        }),
      ],
      insertValues,
      updateValues
    );

    const summary = await syncStores({
      db,
      fetchFn: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify([validSourceRecord]), { status: 200 })
        ),
    });

    expect(summary).toEqual({
      deactivated: 0,
      inserted: 0,
      reactivated: 0,
      unchanged: 1,
      updated: 0,
    });
    expect(insertValues).toEqual([]);
    expect(updateValues).toEqual([]);
  });

  it("fails before any writes when the source fetch fails", async () => {
    const insertValues: Record<string, unknown>[] = [];
    const updateValues: Record<string, unknown>[] = [];
    const db = createMockDb([], insertValues, updateValues);

    await expect(
      syncStores({
        db,
        fetchFn: vi.fn<typeof fetch>().mockRejectedValue(new Error("boom")),
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "FETCH_FAILED",
      })
    );
    expect(insertValues).toEqual([]);
    expect(updateValues).toEqual([]);
  });
});

function createExistingStore(
  overrides: Partial<{
    active: boolean;
    address: string;
    city: string;
    external_id: string;
    id: number;
    lat: string;
    lng: string;
    name: string;
    state: string;
    zip: string;
  }>
) {
  return {
    active: true,
    address: "14050 Burnhaven Dr",
    city: "Burnsville",
    external_id: "1087",
    id: 1,
    lat: "44.75",
    lng: "-93.295",
    name: "Burnsville",
    state: "MN",
    zip: "55337-4407",
    ...overrides,
  };
}

function createMockDb(
  existingStores: readonly Record<string, unknown>[],
  insertValues: Record<string, unknown>[],
  updateValues: Record<string, unknown>[]
): NodePgDatabase {
  const transactionDb = {
    insert: () => ({
      values: (values: readonly Record<string, unknown>[]) => {
        insertValues.push(...values);

        return Promise.resolve(undefined);
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updateValues.push(values);

        return {
          where: () => Promise.resolve(undefined),
        };
      },
    }),
  };

  return {
    select: () => ({
      from: async () => existingStores,
    }),
    transaction: async (
      callback: (tx: typeof transactionDb) => Promise<unknown>
    ) => callback(transactionDb),
  } as unknown as NodePgDatabase;
}
