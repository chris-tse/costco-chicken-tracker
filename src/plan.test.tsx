import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ListWeekdayEvidence,
  ListWeekdayEvidenceResult,
} from "@/lib/sightings";

const HISTORY_GRID_PATTERN = /history grid/i;
const { mockListWeekdayEvidence, mockUseServerFn } = vi.hoisted(() => ({
  mockListWeekdayEvidence: vi.fn(),
  mockUseServerFn: vi.fn(),
}));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal()),
  useServerFn: mockUseServerFn,
}));

import { PlanForm, PlanPage } from "@/app/plan";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Plan route", () => {
  it("reads weekday evidence through the PlanPage server-function wiring", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 10, 14, 5));
    mockUseServerFn.mockReturnValue(mockListWeekdayEvidence);
    mockListWeekdayEvidence.mockResolvedValue({ evidence: [], ok: true });

    render(<PlanPage />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockListWeekdayEvidence).toHaveBeenCalledWith({ data: 1 });
  });

  it("defaults from the client clock and exposes only Capture and Plan in bottom navigation", async () => {
    const listWeekdayEvidence: ListWeekdayEvidence = vi.fn().mockResolvedValue({
      evidence: [],
      ok: true,
    });
    render(
      <PlanForm
        listWeekdayEvidence={listWeekdayEvidence}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    expect(await screen.findByRole("heading", { name: "Plan" })).toBeVisible();
    expect(screen.getByLabelText("Weekday")).toHaveValue("1");
    expect(screen.getByLabelText("Approximate time")).toHaveValue("14:05");
    await waitFor(() => {
      expect(listWeekdayEvidence).toHaveBeenCalledWith(1);
    });
    expect(
      screen.getByRole("heading", { name: "No history for this weekday" })
    ).toBeVisible();
    expect(
      screen.getByText("Selected window: 0 distinct dates.")
    ).toBeVisible();

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(navigation).toHaveTextContent("Capture");
    expect(navigation).toHaveTextContent("Plan");
    expect(navigation.querySelectorAll("a")).toHaveLength(2);
  });

  it("recalculates immediately for time and weekday changes", async () => {
    const listWeekdayEvidence: ListWeekdayEvidence = vi
      .fn()
      .mockResolvedValueOnce({
        evidence: [
          { labelDate: "2026-08-03", labelMinute: 845 },
          { labelDate: "2026-08-10", labelMinute: 845 },
          { labelDate: "2026-08-17", labelMinute: 855 },
          { labelDate: "2026-08-24", labelMinute: 865 },
        ],
        ok: true,
      })
      .mockResolvedValueOnce({ evidence: [], ok: true });
    render(
      <PlanForm
        listWeekdayEvidence={listWeekdayEvidence}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    expect(
      await screen.findByText("Selected window: 3 distinct dates.")
    ).toBeVisible();
    expect(screen.getByTestId("planner-result")).toHaveAttribute(
      "aria-live",
      "polite"
    );
    fireEvent.change(screen.getByLabelText("Approximate time"), {
      target: { value: "15:30" },
    });
    expect(
      screen.getByRole("heading", { name: "No matching sightings yet" })
    ).toBeVisible();
    expect(
      screen.getByText("Selected window: 0 distinct dates.")
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Weekday"), {
      target: { value: "2" },
    });
    await waitFor(() => {
      expect(listWeekdayEvidence).toHaveBeenLastCalledWith(2);
    });
    expect(
      await screen.findByRole("heading", {
        name: "No history for this weekday",
      })
    ).toBeVisible();
  });

  it("coaches through empty and sparse states with a Capture link", async () => {
    const listWeekdayEvidence: ListWeekdayEvidence = vi.fn().mockResolvedValue({
      evidence: [{ labelDate: "2026-08-03", labelMinute: 845 }],
      ok: true,
    });
    render(
      <PlanForm
        listWeekdayEvidence={listWeekdayEvidence}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    expect(
      await screen.findByRole("heading", {
        name: "Not enough history to compare yet",
      })
    ).toBeVisible();
    expect(screen.getByText("Selected window: 1 distinct date.")).toBeVisible();
    const plannerState = screen.getByRole("heading", {
      name: "Not enough history to compare yet",
    }).parentElement;
    expect(plannerState).not.toBeNull();
    expect(plannerState?.querySelector('a[href="/"]')).toHaveTextContent(
      "Capture"
    );
  });

  it("does not show stale weekday evidence while a replacement read is pending", async () => {
    let resolveTuesdayEvidence:
      | ((result: ListWeekdayEvidenceResult) => void)
      | undefined;
    const tuesdayEvidence = new Promise<ListWeekdayEvidenceResult>(
      (resolve) => {
        resolveTuesdayEvidence = resolve;
      }
    );
    const listWeekdayEvidence: ListWeekdayEvidence = vi
      .fn()
      .mockResolvedValueOnce({
        evidence: [{ labelDate: "2026-08-03", labelMinute: 845 }],
        ok: true,
      })
      .mockReturnValueOnce(tuesdayEvidence);
    render(
      <PlanForm
        listWeekdayEvidence={listWeekdayEvidence}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    await screen.findByRole("heading", {
      name: "Not enough history to compare yet",
    });
    fireEvent.change(screen.getByLabelText("Weekday"), {
      target: { value: "2" },
    });

    expect(
      screen.queryByRole("heading", {
        name: "Not enough history to compare yet",
      })
    ).toBeNull();
    expect(screen.getByText("Loading historical sightings…")).toBeVisible();

    resolveTuesdayEvidence?.({ evidence: [], ok: true });
    expect(
      await screen.findByRole("heading", {
        name: "No history for this weekday",
      })
    ).toBeVisible();
  });

  it("ignores a prior weekday response that arrives after the selection changes", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let resolveMondayEvidence:
      | ((result: ListWeekdayEvidenceResult) => void)
      | undefined;
    let resolveTuesdayEvidence:
      | ((result: ListWeekdayEvidenceResult) => void)
      | undefined;
    const mondayEvidence = new Promise<ListWeekdayEvidenceResult>((resolve) => {
      resolveMondayEvidence = resolve;
    });
    const tuesdayEvidence = new Promise<ListWeekdayEvidenceResult>(
      (resolve) => {
        resolveTuesdayEvidence = resolve;
      }
    );
    const listWeekdayEvidence: ListWeekdayEvidence = vi
      .fn()
      .mockReturnValueOnce(mondayEvidence)
      .mockReturnValueOnce(tuesdayEvidence);
    render(
      <PlanForm
        listWeekdayEvidence={listWeekdayEvidence}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    await waitFor(() => {
      expect(listWeekdayEvidence).toHaveBeenCalledWith(1);
    });
    fireEvent.change(screen.getByLabelText("Weekday"), {
      target: { value: "2" },
    });
    await waitFor(() => {
      expect(listWeekdayEvidence).toHaveBeenLastCalledWith(2);
    });

    await act(async () => {
      resolveMondayEvidence?.({
        evidence: [{ labelDate: "2026-08-03", labelMinute: 845 }],
        ok: true,
      });
      await Promise.resolve();
    });
    expect(
      screen.queryByRole("heading", {
        name: "Not enough history to compare yet",
      })
    ).toBeNull();

    await act(async () => {
      resolveTuesdayEvidence?.({ evidence: [], ok: true });
      await Promise.resolve();
    });
    expect(
      await screen.findByRole("heading", {
        name: "No history for this weekday",
      })
    ).toBeVisible();
  });

  it("does not claim to be loading after evidence resolves for an incomplete time", async () => {
    render(
      <PlanForm
        listWeekdayEvidence={vi.fn().mockResolvedValue({
          evidence: [],
          ok: true,
        })}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    await screen.findByRole("heading", { name: "No history for this weekday" });
    fireEvent.change(screen.getByLabelText("Approximate time"), {
      target: { value: "" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a complete approximate time."
    );
    expect(screen.queryByText("Loading historical sightings…")).toBeNull();
  });

  it("keeps an unavailable database distinct from valid empty states", async () => {
    render(
      <PlanForm
        listWeekdayEvidence={vi.fn().mockResolvedValue({
          kind: "unavailable",
          message: "Unable to load planning evidence. Try again.",
          ok: false,
        })}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load planning evidence. Try again."
    );
    expect(
      screen.queryByRole("heading", { name: "No history for this weekday" })
    ).toBeNull();
    expect(screen.getByText("Planning evidence is unavailable.")).toBeVisible();
  });

  it("uses labelled controls and a narrow mobile frame without overflow-prone destinations", async () => {
    render(
      <PlanForm
        listWeekdayEvidence={vi.fn().mockResolvedValue({
          evidence: [],
          ok: true,
        })}
        now={() => new Date(2026, 7, 10, 14, 5)}
      />
    );

    const page = await screen.findByTestId("plan-page");
    expect(page).toHaveClass("max-w-md");
    expect(screen.getByLabelText("Weekday")).toHaveAccessibleName("Weekday");
    expect(screen.getByLabelText("Approximate time")).toHaveAccessibleName(
      "Approximate time"
    );
    expect(screen.queryByText(HISTORY_GRID_PATTERN)).toBeNull();
  });
});
