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

export const updateSightingDonenessInputSchema = z.object({
  doneness: z.enum(DONENESS_VALUES).nullable(),
  id: z.int().positive(),
});

export type UpdateSightingDonenessInput = z.infer<
  typeof updateSightingDonenessInputSchema
>;

export type UpdateSightingDonenessResult =
  | { ok: true; sighting: Sighting }
  | { kind: "not-found"; message: string; ok: false }
  | { kind: "unavailable"; message: string; ok: false };

export type UpdateSightingDoneness = (
  input: UpdateSightingDonenessInput,
  options?: Readonly<{ signal?: AbortSignal }>
) => Promise<UpdateSightingDonenessResult>;

export const sightingIdSchema = z.int().positive();

export const correctSightingInputSchema = createSightingInputSchema.extend({
  doneness: z.enum(DONENESS_VALUES).nullable(),
  id: sightingIdSchema,
});

export type CorrectSightingInput = z.infer<typeof correctSightingInputSchema>;

export type CorrectSightingResult =
  | { ok: true; sighting: Sighting }
  | { kind: "not-found"; message: string; ok: false }
  | { kind: "unavailable"; message: string; ok: false };

export type CorrectSighting = (
  input: CorrectSightingInput
) => Promise<CorrectSightingResult>;

export type ReadSightingResult =
  | { ok: true; sighting: Sighting }
  | { kind: "not-found"; message: string; ok: false }
  | { kind: "unavailable"; message: string; ok: false };

export type GetSighting = (id: number) => Promise<ReadSightingResult>;

export type ListRecentSightingsResult =
  | { ok: true; sightings: Sighting[] }
  | { kind: "unavailable"; message: string; ok: false };

export type ListRecentSightings = () => Promise<ListRecentSightingsResult>;

export const weekdaySchema = z.int().min(0).max(6);

export type ListWeekdayEvidenceResult =
  | {
      evidence: Array<{ labelDate: string; labelMinute: number }>;
      ok: true;
    }
  | { kind: "unavailable"; message: string; ok: false };

export type ListWeekdayEvidence = (
  weekday: number
) => Promise<ListWeekdayEvidenceResult>;

export type DeleteSightingResult =
  | { ok: true }
  | { kind: "not-found"; message: string; ok: false }
  | { kind: "unavailable"; message: string; ok: false };

export type DeleteSighting = (id: number) => Promise<DeleteSightingResult>;

export const SAVE_FAILURE_MESSAGE =
  "Unable to save label time. Check your connection and try again.";

export const DONENESS_FAILURE_MESSAGE = "Unable to save doneness. Try again.";

export const CORRECTION_FAILURE_MESSAGE =
  "Unable to save this correction. Try again.";

export const DELETE_FAILURE_MESSAGE =
  "Unable to delete this sighting. Try again.";

export const RECENT_SIGHTINGS_FAILURE_MESSAGE =
  "Unable to load recent sightings. Try again.";

export const PLANNER_EVIDENCE_FAILURE_MESSAGE =
  "Unable to load planning evidence. Try again.";

export const SIGHTING_NOT_FOUND_MESSAGE =
  "This sighting is no longer available.";
