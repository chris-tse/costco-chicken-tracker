import { createServerFn } from "@tanstack/react-start";

import { createSightingInputSchema } from "@/lib/sightings";

export const saveSighting = createServerFn({ method: "POST" })
  .inputValidator(createSightingInputSchema)
  .handler(async ({ data }) => {
    const { sightingOperations } = await import("@/lib/sightings.server");

    return sightingOperations.create(data);
  });
