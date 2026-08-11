import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaptureForm } from "@/app/index";
import type { CreateSighting, Sighting } from "@/lib/sightings";

const createdAt = new Date("2026-08-11T19:05:00.000Z");
const RECENT_TIME_PATTERN = /at 2:05 PM/;
const OLDEST_SIGHTING_PATTERN = /December 31, 2025/;
const NEWEST_SIGHTING_PATTERN = /August 11, 2026/;

const createSighting = (id: number, labelDate: string): Sighting => ({
  createdAt,
  doneness: null,
  id,
  labelDate,
  labelMinute: 845,
  updatedAt: createdAt,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Recent Sightings", () => {
  it("shows exactly the three most recent supplied sightings and opens the selected identity", async () => {
    const onOpenRecentCorrection = vi.fn();
    render(
      <CaptureForm
        listRecentSightings={vi.fn().mockResolvedValue({
          ok: true,
          sightings: [
            createSighting(4, "2026-08-10"),
            createSighting(3, "2020-01-01"),
            createSighting(2, "2024-02-29"),
            createSighting(1, "2025-12-31"),
          ],
        })}
        now={() => new Date(2026, 7, 11, 14, 5)}
        onOpenRecentCorrection={onOpenRecentCorrection}
        saveSighting={vi.fn()}
      />
    );

    await screen.findByRole("heading", { name: "Recent Sightings" });
    const sightingButtons = await screen.findAllByRole("button", {
      name: RECENT_TIME_PATTERN,
    });
    expect(sightingButtons).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: OLDEST_SIGHTING_PATTERN })
    ).toBeNull();

    fireEvent.click(sightingButtons[1]);
    await waitFor(() => {
      expect(onOpenRecentCorrection).toHaveBeenCalledWith(3);
    });
  });

  it("announces a retryable recent-list failure without hiding Capture", async () => {
    render(
      <CaptureForm
        listRecentSightings={vi.fn().mockResolvedValue({
          kind: "unavailable",
          message: "Unable to load recent sightings. Try again.",
          ok: false,
        })}
        now={() => new Date(2026, 7, 11, 14, 5)}
        saveSighting={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to load recent sightings"
      );
    });
    expect(
      screen.getByRole("button", { name: "Save label time" })
    ).toBeTruthy();
  });

  it("refreshes recent sightings after completion closes so the new sighting is first", async () => {
    const savedSighting = createSighting(8, "2026-08-11");
    const listRecentSightings = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, sightings: [] })
      .mockResolvedValueOnce({
        ok: true,
        sightings: [savedSighting],
      });
    const saveSighting: CreateSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: savedSighting,
    });
    render(
      <CaptureForm
        listRecentSightings={listRecentSightings}
        now={() => new Date(2026, 7, 11, 14, 5)}
        saveSighting={saveSighting}
        updateSightingDoneness={vi.fn()}
      />
    );

    await screen.findByText("No sightings yet.");
    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(listRecentSightings).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByRole("button", { name: NEWEST_SIGHTING_PATTERN })
    ).toBeTruthy();
  });
});
