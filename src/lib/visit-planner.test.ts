import { describe, expect, it } from "vitest";

import {
  calculatePlannerSignal,
  calculateVisitPlan,
  type WeekdayEvidence,
} from "@/lib/visit-planner";

const evidence = (labelDate: string, labelMinute: number): WeekdayEvidence => ({
  labelDate,
  labelMinute,
});

describe("calculateVisitPlan", () => {
  it("counts distinct dates in an inclusive ten-minute window", () => {
    const plan = calculateVisitPlan(
      [
        evidence("2026-08-03", 590),
        evidence("2026-08-03", 600),
        evidence("2026-08-10", 610),
        evidence("2026-08-17", 611),
      ],
      600
    );

    expect(plan).toMatchObject({
      candidateCount: 4,
      historicalDateCount: 3,
      selectedDateCount: 2,
      state: "insufficient-comparison",
    });
  });

  it("does not wrap matching windows across midnight", () => {
    const plan = calculateVisitPlan(
      [
        evidence("2026-08-03", 0),
        evidence("2026-08-10", 5),
        evidence("2026-08-17", 1439),
        evidence("2026-08-24", 1435),
      ],
      0
    );

    expect(plan).toMatchObject({
      historicalDateCount: 4,
      selectedDateCount: 2,
      state: "comparative",
    });
  });

  it("deduplicates date-minute evidence and candidate minutes but retains overlapping windows", () => {
    const plan = calculateVisitPlan(
      [
        evidence("2026-08-03", 600),
        evidence("2026-08-03", 600),
        evidence("2026-08-10", 605),
        evidence("2026-08-17", 605),
        evidence("2026-08-24", 610),
      ],
      605
    );

    expect(plan).toMatchObject({
      candidateCount: 3,
      historicalDateCount: 4,
      selectedDateCount: 4,
      state: "comparative",
    });
    if (plan.state !== "comparative") {
      return;
    }
    expect(plan.candidateScores).toEqual([4, 4, 4]);
  });

  it("is independent of evidence input order", () => {
    const sightings = [
      evidence("2026-08-03", 700),
      evidence("2026-08-10", 710),
      evidence("2026-08-17", 720),
      evidence("2026-08-24", 730),
    ];

    expect(calculateVisitPlan(sightings, 710)).toEqual(
      calculateVisitPlan([...sightings].reverse(), 710)
    );
  });

  it("uses no history, zero matches, then insufficient comparison as state precedence", () => {
    expect(calculateVisitPlan([], 600)).toMatchObject({
      selectedDateCount: 0,
      state: "no-weekday-history",
    });
    expect(
      calculateVisitPlan([evidence("2026-08-03", 600)], 900)
    ).toMatchObject({
      selectedDateCount: 0,
      state: "zero-selected-matches",
    });
    expect(
      calculateVisitPlan([evidence("2026-08-03", 600)], 600)
    ).toMatchObject({
      selectedDateCount: 1,
      state: "insufficient-comparison",
    });
  });

  it("requires four distinct historical dates and three distinct candidate minutes", () => {
    expect(
      calculateVisitPlan(
        [
          evidence("2026-08-03", 600),
          evidence("2026-08-10", 600),
          evidence("2026-08-17", 610),
          evidence("2026-08-24", 610),
        ],
        600
      )
    ).toMatchObject({
      candidateCount: 2,
      historicalDateCount: 4,
      state: "insufficient-comparison",
    });
    expect(
      calculateVisitPlan(
        [
          evidence("2026-08-03", 600),
          evidence("2026-08-10", 610),
          evidence("2026-08-17", 620),
        ],
        600
      )
    ).toMatchObject({
      candidateCount: 3,
      historicalDateCount: 3,
      state: "insufficient-comparison",
    });
  });

  it.each([
    { candidateScores: [1, 2, 3], selectedScore: 3, signal: "better" },
    { candidateScores: [1, 2, 3], selectedScore: 2, signal: "typical" },
    { candidateScores: [1, 2, 3], selectedScore: 1, signal: "quieter" },
    { candidateScores: [2, 2, 3], selectedScore: 3, signal: "better" },
    { candidateScores: [2, 2, 3], selectedScore: 2, signal: "typical" },
    { candidateScores: [1, 2, 2], selectedScore: 1, signal: "quieter" },
    { candidateScores: [2, 2, 2], selectedScore: 2, signal: "typical" },
    { candidateScores: [1, 2, 3, 4], selectedScore: 3, signal: "typical" },
    { candidateScores: [1, 2, 3, 4], selectedScore: 4, signal: "better" },
    { candidateScores: [1, 2, 3, 4], selectedScore: 2, signal: "typical" },
    { candidateScores: [1, 2, 3, 4], selectedScore: 1, signal: "quieter" },
    { candidateScores: [4, 3, 2, 1], selectedScore: 1, signal: "quieter" },
  ])("classifies $selectedScore among $candidateScores as $signal", ({
    candidateScores,
    selectedScore,
    signal,
  }) => {
    const plan = calculatePlannerSignal({
      candidateScores,
      historicalDateCount: 4,
      selectedDateCount: selectedScore,
    });

    expect(plan).toMatchObject({
      selectedDateCount: selectedScore,
      signal,
      state: "comparative",
    });
  });
});
