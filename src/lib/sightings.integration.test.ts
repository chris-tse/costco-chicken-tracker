// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { schema } from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
const migrationPath = resolve(
  process.cwd(),
  "drizzle/20260811072733_early_luke_cage/migration.sql"
);

if (databaseUrl) {
  describe("sighting persistence", () => {
    let client: Client;

    beforeEach(async () => {
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query('DROP TABLE IF EXISTS "sightings"');

      const migration = await readFile(migrationPath, "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        await client.query(statement);
      }
    });

    afterEach(async () => {
      await client.end();
    });

    it("applies the baseline constraints and permits duplicate label facts", async () => {
      const database = drizzle(databaseUrl, { schema });
      const { createSightingOperations } = await import("./sightings.server");
      const operations = createSightingOperations(database);

      try {
        const first = await operations.create({
          labelDate: "2026-08-11",
          labelMinute: 845,
        });
        const duplicate = await operations.create({
          labelDate: "2026-08-11",
          labelMinute: 845,
        });

        expect(first).toMatchObject({
          ok: true,
          sighting: {
            doneness: null,
            labelDate: "2026-08-11",
            labelMinute: 845,
          },
        });
        expect(duplicate).toMatchObject({
          ok: true,
          sighting: { labelDate: "2026-08-11", labelMinute: 845 },
        });
        expect(
          first.ok && duplicate.ok && duplicate.sighting.id
        ).toBeGreaterThan(first.ok ? first.sighting.id : 0);

        await expect(
          client.query(
            "insert into sightings (label_date, label_minute) values ('2026-08-11', 1440)"
          )
        ).rejects.toMatchObject({ code: "23514" });
        await expect(
          client.query(
            "insert into sightings (label_date, label_minute, doneness) values ('2026-08-11', 0, 'raw')"
          )
        ).rejects.toMatchObject({ code: "23514" });
      } finally {
        await database.$client.end();
      }
    });

    it("creates the required representation and only its initial recency index", async () => {
      const columns = await client.query<{ column_name: string }>(
        "select column_name from information_schema.columns where table_name = 'sightings' order by ordinal_position"
      );
      const indexes = await client.query<{ indexname: string }>(
        "select indexname from pg_indexes where tablename = 'sightings' order by indexname"
      );

      expect(columns.rows.map((column) => column.column_name)).toEqual([
        "id",
        "label_date",
        "label_minute",
        "doneness",
        "created_at",
        "updated_at",
      ]);
      expect(indexes.rows.map((index) => index.indexname)).toEqual([
        "sightings_pkey",
        "sightings_recent_idx",
      ]);
    });

    it("updates only nullable doneness and advances the update instant", async () => {
      const database = drizzle(databaseUrl, { schema });
      const { createSightingOperations } = await import("./sightings.server");
      const operations = createSightingOperations(database);

      try {
        const created = await operations.create({
          labelDate: "2024-02-29",
          labelMinute: 480,
        });
        expect(created.ok).toBe(true);
        if (!created.ok) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
        const enriched = await operations.updateDoneness({
          doneness: "dark",
          id: created.sighting.id,
        });

        expect(enriched).toMatchObject({
          ok: true,
          sighting: {
            doneness: "dark",
            id: created.sighting.id,
            labelDate: "2024-02-29",
            labelMinute: 480,
          },
        });
        expect(
          enriched.ok && enriched.sighting.updatedAt.getTime()
        ).toBeGreaterThan(created.sighting.updatedAt.getTime());

        const cleared = await operations.updateDoneness({
          doneness: null,
          id: created.sighting.id,
        });
        expect(cleared).toMatchObject({
          ok: true,
          sighting: { doneness: null, id: created.sighting.id },
        });
      } finally {
        await database.$client.end();
      }
    });

    it("returns a structured result when the targeted sighting is missing", async () => {
      const database = drizzle(databaseUrl, { schema });
      const { createSightingOperations } = await import("./sightings.server");
      const operations = createSightingOperations(database);

      try {
        await expect(
          operations.updateDoneness({ doneness: "light", id: 99 })
        ).resolves.toEqual({
          message: "This sighting is no longer available.",
          ok: false,
        });
      } finally {
        await database.$client.end();
      }
    });
  });
}
