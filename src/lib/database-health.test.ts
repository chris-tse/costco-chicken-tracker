import { describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { execute: mockExecute },
}));

import { isDatabaseReachable } from "@/lib/database-health";

describe("database health", () => {
  it("reports ready only after PostgreSQL accepts a query", async () => {
    mockExecute.mockResolvedValueOnce({});

    await expect(isDatabaseReachable()).resolves.toBe(true);
  });

  it("reports unavailable after PostgreSQL connectivity is lost", async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection terminated"));

    await expect(isDatabaseReachable()).resolves.toBe(false);
  });
});
