export const PLANNER_WINDOW_RADIUS_MINUTES = 10;
export const MINUTES_PER_DAY = 24 * 60;
export const MINIMUM_COMPARISON_DATES = 4;
export const MINIMUM_COMPARISON_CANDIDATES = 3;

export type WeekdayEvidence = Readonly<{
  labelDate: string;
  labelMinute: number;
}>;

// biome-ignore lint/style/useConsistentTypeDefinitions: AGENTS.md prefers types unless extending.
type PlannerStateBase = {
  candidateCount: number;
  historicalDateCount: number;
  selectedDateCount: number;
};

export type VisitPlan =
  | (PlannerStateBase & { state: "no-weekday-history" })
  | (PlannerStateBase & { state: "zero-selected-matches" })
  | (PlannerStateBase & { state: "insufficient-comparison" })
  | (PlannerStateBase & {
      candidateScores: number[];
      signal: "better" | "typical" | "quieter";
      state: "comparative";
    });

export function calculateVisitPlan(
  evidence: readonly WeekdayEvidence[],
  selectedMinute: number
): VisitPlan {
  const distinctEvidence = getDistinctEvidence(evidence);
  const historicalDateCount = new Set(
    distinctEvidence.map(({ labelDate }) => labelDate)
  ).size;
  const candidateMinutes = Array.from(
    new Set(distinctEvidence.map(({ labelMinute }) => labelMinute))
  ).sort((first, second) => first - second);
  const selectedDateCount = scoreWindow(distinctEvidence, selectedMinute);
  const candidateScores = candidateMinutes.map((minute) =>
    scoreWindow(distinctEvidence, minute)
  );

  return calculatePlannerSignal({
    candidateScores,
    historicalDateCount,
    selectedDateCount,
  });
}

export function calculatePlannerSignal({
  candidateScores,
  historicalDateCount,
  selectedDateCount,
}: Readonly<{
  candidateScores: readonly number[];
  historicalDateCount: number;
  selectedDateCount: number;
}>): VisitPlan {
  const candidateCount = candidateScores.length;
  const base = {
    candidateCount,
    historicalDateCount,
    selectedDateCount,
  };

  if (historicalDateCount === 0) {
    return { ...base, state: "no-weekday-history" };
  }

  if (selectedDateCount === 0) {
    return { ...base, state: "zero-selected-matches" };
  }

  if (
    historicalDateCount < MINIMUM_COMPARISON_DATES ||
    candidateCount < MINIMUM_COMPARISON_CANDIDATES
  ) {
    return { ...base, state: "insufficient-comparison" };
  }

  const lowerScoreCount = candidateScores.filter(
    (candidateScore) => candidateScore < selectedDateCount
  ).length;
  const higherScoreCount = candidateScores.filter(
    (candidateScore) => candidateScore > selectedDateCount
  ).length;
  let signal: "better" | "typical" | "quieter" = "typical";
  if (3 * lowerScoreCount >= 2 * candidateCount) {
    signal = "better";
  } else if (3 * higherScoreCount >= 2 * candidateCount) {
    signal = "quieter";
  }

  return {
    ...base,
    candidateScores: [...candidateScores],
    signal,
    state: "comparative",
  };
}

function getDistinctEvidence(
  evidence: readonly WeekdayEvidence[]
): WeekdayEvidence[] {
  const seenEvidence = new Set<string>();
  const distinctEvidence: WeekdayEvidence[] = [];

  for (const entry of evidence) {
    const evidenceKey = `${entry.labelDate}\u0000${entry.labelMinute}`;
    if (seenEvidence.has(evidenceKey)) {
      continue;
    }

    seenEvidence.add(evidenceKey);
    distinctEvidence.push(entry);
  }

  return distinctEvidence;
}

function scoreWindow(
  evidence: readonly WeekdayEvidence[],
  centerMinute: number
): number {
  const windowStart = Math.max(0, centerMinute - PLANNER_WINDOW_RADIUS_MINUTES);
  const windowEnd = Math.min(
    MINUTES_PER_DAY - 1,
    centerMinute + PLANNER_WINDOW_RADIUS_MINUTES
  );
  const matchingDates = new Set<string>();

  for (const entry of evidence) {
    if (entry.labelMinute >= windowStart && entry.labelMinute <= windowEnd) {
      matchingDates.add(entry.labelDate);
    }
  }

  return matchingDates.size;
}
