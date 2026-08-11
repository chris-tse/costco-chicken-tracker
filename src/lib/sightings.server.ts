import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "@/lib/db";
import { type schema, sightings } from "@/lib/db/schema";
import {
  CORRECTION_FAILURE_MESSAGE,
  type CorrectSighting,
  type CorrectSightingInput,
  type CreateSighting,
  type CreateSightingInput,
  type CreateSightingResult,
  DELETE_FAILURE_MESSAGE,
  type DeleteSighting,
  type DeleteSightingResult,
  DONENESS_FAILURE_MESSAGE,
  type GetSighting,
  type ListRecentSightings,
  type ListRecentSightingsResult,
  RECENT_SIGHTINGS_FAILURE_MESSAGE,
  SAVE_FAILURE_MESSAGE,
  SIGHTING_NOT_FOUND_MESSAGE,
  type UpdateSightingDoneness,
  type UpdateSightingDonenessInput,
  type UpdateSightingDonenessResult,
} from "@/lib/sightings";

type Database = NodePgDatabase<typeof schema>;

export function createSightingOperations(database: Database): {
  correct: CorrectSighting;
  create: CreateSighting;
  delete: DeleteSighting;
  get: GetSighting;
  listRecent: ListRecentSightings;
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
    listRecent: async (): Promise<ListRecentSightingsResult> => {
      try {
        const recentSightings = await database
          .select()
          .from(sightings)
          .orderBy(desc(sightings.createdAt), desc(sightings.id))
          .limit(3);

        return { ok: true, sightings: recentSightings };
      } catch {
        return {
          kind: "unavailable",
          message: RECENT_SIGHTINGS_FAILURE_MESSAGE,
          ok: false,
        };
      }
    },
    get: async (id) => {
      try {
        const [record] = await database
          .select()
          .from(sightings)
          .where(eq(sightings.id, id));

        if (!record) {
          return {
            kind: "not-found",
            message: SIGHTING_NOT_FOUND_MESSAGE,
            ok: false,
          };
        }

        return { ok: true, sighting: record };
      } catch {
        return {
          kind: "unavailable",
          message: RECENT_SIGHTINGS_FAILURE_MESSAGE,
          ok: false,
        };
      }
    },
    correct: async (input: CorrectSightingInput) => {
      try {
        const [record] = await database
          .update(sightings)
          .set({
            doneness: input.doneness,
            labelDate: input.labelDate,
            labelMinute: input.labelMinute,
            updatedAt: new Date(),
          })
          .where(eq(sightings.id, input.id))
          .returning();

        if (!record) {
          return {
            kind: "not-found",
            message: SIGHTING_NOT_FOUND_MESSAGE,
            ok: false,
          };
        }

        return { ok: true, sighting: record };
      } catch {
        return {
          kind: "unavailable",
          message: CORRECTION_FAILURE_MESSAGE,
          ok: false,
        };
      }
    },
    delete: async (id: number): Promise<DeleteSightingResult> => {
      try {
        const [record] = await database
          .delete(sightings)
          .where(eq(sightings.id, id))
          .returning({ id: sightings.id });

        if (!record) {
          return {
            kind: "not-found",
            message: SIGHTING_NOT_FOUND_MESSAGE,
            ok: false,
          };
        }

        return { ok: true };
      } catch {
        return {
          kind: "unavailable",
          message: DELETE_FAILURE_MESSAGE,
          ok: false,
        };
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
            message: SIGHTING_NOT_FOUND_MESSAGE,
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
