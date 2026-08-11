import { z } from "zod";

export const DONENESS_VALUES = ["light", "medium", "dark"] as const;
export type Doneness = (typeof DONENESS_VALUES)[number];

export const createSightingInputSchema = z.object({
  labelDate: z.iso.date(),
  labelMinute: z.int().min(0).max(1439),
});

export type CreateSightingInput = z.infer<typeof createSightingInputSchema>;

// biome-ignore lint/style/useConsistentTypeDefinitions: AGENTS.md prefers types unless extending.
export type Sighting = {
  createdAt: Date;
  doneness: Doneness | null;
  id: number;
  labelDate: string;
  labelMinute: number;
  updatedAt: Date;
};

export type CreateSightingResult =
  | { ok: true; sighting: Sighting }
  | { message: string; ok: false };

export type CreateSighting = (
  input: CreateSightingInput
) => Promise<CreateSightingResult>;

export const SAVE_FAILURE_MESSAGE =
  "Unable to save label time. Check your connection and try again.";
