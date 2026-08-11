import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "@/lib/db";
import { type schema, sightings } from "@/lib/db/schema";
import {
  type CreateSighting,
  type CreateSightingInput,
  type CreateSightingResult,
  DONENESS_FAILURE_MESSAGE,
  SAVE_FAILURE_MESSAGE,
  type UpdateSightingDoneness,
  type UpdateSightingDonenessInput,
  type UpdateSightingDonenessResult,
} from "@/lib/sightings";

type Database = NodePgDatabase<typeof schema>;

export function createSightingOperations(database: Database): {
  create: CreateSighting;
  updateDoneness: UpdateSightingDoneness;
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
    updateDoneness: async (
      input: UpdateSightingDonenessInput
    ): Promise<UpdateSightingDonenessResult> => {
      try {
        const [record] = await database
          .update(sightings)
          .set({ doneness: input.doneness, updatedAt: new Date() })
          .where(eq(sightings.id, input.id))
          .returning();

        if (!record) {
          return {
            kind: "not-found",
            message: "This sighting is no longer available.",
            ok: false,
          };
        }

        return { ok: true, sighting: record };
      } catch {
        return {
          kind: "unavailable",
          message: DONENESS_FAILURE_MESSAGE,
          ok: false,
        };
      }
    },
  };
}

export const sightingOperations = createSightingOperations(db);
