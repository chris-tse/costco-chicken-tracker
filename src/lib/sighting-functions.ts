import { createServerFn } from "@tanstack/react-start";

import {
  createSightingInputSchema,
  updateSightingDonenessInputSchema,
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
