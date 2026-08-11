import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CorrectionEditor } from "@/app/sightings/$sightingId";
import type {
  CorrectSighting,
  DeleteSighting,
  GetSighting,
  Sighting,
} from "@/lib/sightings";

const DEFAULT_SIGHTING: Sighting = {
  createdAt: new Date("2026-08-11T19:05:00.000Z"),
  doneness: "dark",
  id: 7,
  labelDate: "2026-08-11",
  labelMinute: 845,
  updatedAt: new Date("2026-08-11T19:05:00.000Z"),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCorrection({
  correctSighting = vi.fn(),
  deleteSighting = vi.fn(),
  getSighting = vi.fn().mockResolvedValue({
    ok: true,
    sighting: DEFAULT_SIGHTING,
  }),
  onCancel = vi.fn(),
  onDeleted = vi.fn(),
  onNotFoundReturn = vi.fn(),
  onSaved = vi.fn(),
}: Partial<{
  correctSighting: CorrectSighting;
  deleteSighting: DeleteSighting;
  getSighting: GetSighting;
  onCancel: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onNotFoundReturn: () => Promise<void>;
  onSaved: (sighting: Sighting) => Promise<void>;
}> = {}): {
  correctSighting: CorrectSighting;
  deleteSighting: DeleteSighting;
  getSighting: GetSighting;
  onCancel: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onNotFoundReturn: () => Promise<void>;
  onSaved: (sighting: Sighting) => Promise<void>;
} {
  render(
    <CorrectionEditor
      correctSighting={correctSighting}
      deleteSighting={deleteSighting}
      getSighting={getSighting}
      id={DEFAULT_SIGHTING.id}
      onCancel={onCancel}
      onDeleted={onDeleted}
      onNotFoundReturn={onNotFoundReturn}
      onSaved={onSaved}
    />
  );

  return {
    correctSighting,
    deleteSighting,
    getSighting,
    onCancel,
    onDeleted,
    onNotFoundReturn,
    onSaved,
  };
}

describe("Correction", () => {
  it("loads an identity-addressed sighting into a keyboard-focused full-screen editor", async () => {
    renderCorrection();

    await screen.findByLabelText("Label date");
    const heading = screen.getByRole("heading", { name: "Correct sighting" });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText("Label time")).toHaveValue("14:05");
    expect(screen.getByLabelText("Doneness")).toHaveValue("dark");
    expect(
      screen.getByRole("button", { name: "Save correction" })
    ).toBeTruthy();
  });

  it("replaces label facts and nullable doneness together, then returns the persisted sighting", async () => {
    const correctedSighting = {
      ...DEFAULT_SIGHTING,
      doneness: null,
      labelDate: "2024-02-29",
      labelMinute: 480,
      updatedAt: new Date("2026-08-11T19:10:00.000Z"),
    };
    const correctSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: correctedSighting,
    });
    const { onSaved } = renderCorrection({ correctSighting });

    await screen.findByLabelText("Label date");
    fireEvent.change(screen.getByLabelText("Label date"), {
      target: { value: "2024-02-29" },
    });
    fireEvent.change(screen.getByLabelText("Label time"), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText("Doneness"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() => {
      expect(correctSighting).toHaveBeenCalledWith({
        doneness: null,
        id: 7,
        labelDate: "2024-02-29",
        labelMinute: 480,
      });
    });
    expect(onSaved).toHaveBeenCalledWith(correctedSighting);
  });

  it("does not repeat a saved correction when returning to the origin fails", async () => {
    const correctedSighting = {
      ...DEFAULT_SIGHTING,
      labelMinute: 480,
    };
    const correctSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: correctedSighting,
    });
    const onSaved = vi
      .fn<(sighting: Sighting) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Navigation unavailable"))
      .mockResolvedValueOnce(undefined);
    renderCorrection({ correctSighting, onSaved });

    await screen.findByLabelText("Label date");
    fireEvent.change(screen.getByLabelText("Label time"), {
      target: { value: "08:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Correction saved" })
      ).toHaveFocus();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Correction saved, but unable to return to Capture. Try again."
    );
    expect(screen.queryByLabelText("Label date")).toBeNull();
    expect(correctSighting).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(correctedSighting);

    fireEvent.click(screen.getByRole("button", { name: "Return to Capture" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(2);
    });
    expect(correctSighting).toHaveBeenCalledTimes(1);
  });

  it("cancels without mutating the sighting", async () => {
    const { correctSighting, deleteSighting, onCancel } = renderCorrection();

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(correctSighting).not.toHaveBeenCalled();
    expect(deleteSighting).not.toHaveBeenCalled();
  });

  it("keeps the loaded editor available when Cancel cannot return to Capture", async () => {
    const onCancel = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("Navigation unavailable"));
    const { correctSighting, deleteSighting } = renderCorrection({ onCancel });

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to return to Capture. Try again."
      );
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(correctSighting).not.toHaveBeenCalled();
    expect(deleteSighting).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("keeps corrected facts visible after a correction failure and provides a retry path", async () => {
    const correctSighting = vi.fn().mockResolvedValue({
      kind: "unavailable",
      message: "Unable to save this correction. Try again.",
      ok: false,
    });
    renderCorrection({ correctSighting });

    await screen.findByLabelText("Label date");
    fireEvent.change(screen.getByLabelText("Label time"), {
      target: { value: "08:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to save this correction"
      );
    });
    expect(screen.getByLabelText("Label time")).toHaveValue("08:00");
    expect(
      screen.getByRole("button", { name: "Save correction" })
    ).toBeEnabled();
  });

  it("shows a stable not-found state for a missing identity", async () => {
    renderCorrection({
      getSighting: vi.fn().mockResolvedValue({
        kind: "not-found",
        message: "This sighting is no longer available.",
        ok: false,
      }),
    });

    expect(
      await screen.findByRole("heading", { name: "Sighting not found" })
    ).toBeTruthy();
    expect(
      screen.getByText("This sighting is no longer available.")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Return to Capture" })
    ).toBeTruthy();
    expect(screen.queryByLabelText("Label date")).toBeNull();
  });

  it("requires confirmation before hard deletion and lets the tracker cancel it", async () => {
    const { deleteSighting } = renderCorrection();

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Delete sighting" }));
    const confirmation = screen.getByRole("dialog");
    expect(confirmation).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Permanently delete this sighting?" })
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Keep sighting" }));

    expect(deleteSighting).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "Delete sighting" })
    ).toHaveFocus();
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
  });

  it("deletes permanently only after confirmation and returns to the origin", async () => {
    const deleteSighting = vi.fn().mockResolvedValue({ ok: true });
    const { onDeleted } = renderCorrection({ deleteSighting });

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Delete sighting" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(deleteSighting).toHaveBeenCalledWith(7);
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a completed deletion when returning to the origin fails", async () => {
    const deleteSighting = vi.fn().mockResolvedValue({ ok: true });
    const onDeleted = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Navigation unavailable"))
      .mockResolvedValueOnce(undefined);
    renderCorrection({ deleteSighting, onDeleted });

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Delete sighting" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sighting deleted" })
      ).toHaveFocus();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sighting deleted, but unable to return to Capture. Try again."
    );
    expect(
      screen.queryByRole("button", { name: "Delete sighting" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Permanently delete" })
    ).toBeNull();
    expect(deleteSighting).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Return to Capture" }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(2);
    });
    expect(deleteSighting).toHaveBeenCalledTimes(1);
  });

  it("keeps the editor and sighting visible when deletion fails", async () => {
    const deleteSighting = vi.fn().mockResolvedValue({
      kind: "unavailable",
      message: "Unable to delete this sighting. Try again.",
      ok: false,
    });
    renderCorrection({ deleteSighting });

    await screen.findByLabelText("Label date");
    fireEvent.click(screen.getByRole("button", { name: "Delete sighting" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to delete this sighting"
      );
    });
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
