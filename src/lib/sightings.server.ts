import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "@/lib/db";
import { type schema, sightings } from "@/lib/db/schema";
import {
  type CreateSighting,
  type CreateSightingInput,
  type CreateSightingResult,
  SAVE_FAILURE_MESSAGE,
} from "@/lib/sightings";

type Database = NodePgDatabase<typeof schema>;

export function createSightingOperations(database: Database): {
  create: CreateSighting;
} {
  return {
    create: async (
      input: CreateSightingInput
    ): Promise<CreateSightingResult> => {
      try {
        const [record] = await database
          .insert(sightings)
          .values(input)
          .returning();

        if (!record) {
          return { message: SAVE_FAILURE_MESSAGE, ok: false };
        }

        return { ok: true, sighting: record };
      } catch {
        return { message: SAVE_FAILURE_MESSAGE, ok: false };
      }
    },
  };
}

export const sightingOperations = createSightingOperations(db);
