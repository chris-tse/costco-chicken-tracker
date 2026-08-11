import { createServerFn } from "@tanstack/react-start";

import {
  correctSightingInputSchema,
  createSightingInputSchema,
  sightingIdSchema,
  updateSightingDonenessInputSchema,
  weekdaySchema,
} from "@/lib/sightings";

export const saveSighting = createServerFn({ method: "POST" })
  .inputValidator(createSightingInputSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.create(data);
  });

export const updateSightingDoneness = createServerFn({ method: "POST" })
  .inputValidator(updateSightingDonenessInputSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.updateDoneness(data);
  });

export const getSighting = createServerFn({ method: "GET" })
  .inputValidator(sightingIdSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.get(data);
  });

export const listRecentSightings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.listRecent();
  }
);

export const listWeekdayEvidence = createServerFn({ method: "GET" })
  .inputValidator(weekdaySchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.listWeekdayEvidence(data);
  });

export const correctSighting = createServerFn({ method: "POST" })
  .inputValidator(correctSightingInputSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.correct(data);
  });

export const deleteSighting = createServerFn({ method: "POST" })
  .inputValidator(sightingIdSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.delete(data);
  });
