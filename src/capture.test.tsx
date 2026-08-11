import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type CreateSighting, SAVE_FAILURE_MESSAGE } from "@/lib/sightings";

import { CaptureForm } from "./app/index";

const DEFAULT_CLOCK = new Date(2026, 7, 11, 14, 5);
const SAVED_LABEL_TIME_MESSAGE =
  /Saved label time for August 11, 2026 at 8:00 AM/;

afterEach(cleanup);

function renderCapture(saveSighting: CreateSighting): void {
  render(<CaptureForm now={() => DEFAULT_CLOCK} saveSighting={saveSighting} />);
}

describe("Capture", () => {
  it("defaults to the device's local date and minute", () => {
    renderCapture(vi.fn());

    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText("Label time")).toHaveValue("14:05");
  });

  it("warns but allows a label time outside store hours", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: {
        createdAt: new Date("2026-08-11T19:05:00.000Z"),
        doneness: null,
        id: 1,
        labelDate: "2026-08-11",
        labelMinute: 480,
        updatedAt: new Date("2026-08-11T19:05:00.000Z"),
      },
    });
    renderCapture(saveSighting);

    fireEvent.change(screen.getByLabelText("Label time"), {
      target: { value: "08:00" },
    });
    expect(screen.getByText("Outside store hours")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));

    await waitFor(() => {
      expect(saveSighting).toHaveBeenCalledWith({
        labelDate: "2026-08-11",
        labelMinute: 480,
      });
    });
    expect(screen.getByText(SAVED_LABEL_TIME_MESSAGE)).toBeTruthy();
  });

  it("blocks invalid input before save", () => {
    const saveSighting = vi.fn();
    renderCapture(saveSighting);

    fireEvent.change(screen.getByLabelText("Label date"), {
      target: { value: "2026-02-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));

    expect(screen.getByText("Enter a complete real date.")).toBeTruthy();
    expect(saveSighting).not.toHaveBeenCalled();
  });

  it("prevents duplicate saves while communicating progress", async () => {
    let resolveSave:
      | ((value: Awaited<ReturnType<CreateSighting>>) => void)
      | undefined;
    const saveSighting = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<CreateSighting>>>((resolve) => {
          resolveSave = resolve;
        })
    );
    renderCapture(saveSighting);

    const saveButton = screen.getByRole("button", { name: "Save label time" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(saveSighting).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Saving label time");
    expect(saveButton).toBeDisabled();

    resolveSave?.({
      ok: false,
      message:
        "Unable to save label time. Check your connection and try again.",
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to save label time"
      );
    });
  });

  it("keeps entered facts available after an initial save failure", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: false,
      message:
        "Unable to save label time. Check your connection and try again.",
    });
    renderCapture(saveSighting);

    fireEvent.change(screen.getByLabelText("Label date"), {
      target: { value: "2024-02-29" },
    });
    fireEvent.change(screen.getByLabelText("Label time"), {
      target: { value: "20:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByLabelText("Label date")).toHaveValue("2024-02-29");
    expect(screen.getByLabelText("Label time")).toHaveValue("20:30");
    expect(screen.queryByText("Sighting saved")).toBeNull();
  });

  it("recovers when the save request rejects", async () => {
    const saveSighting = vi
      .fn()
      .mockRejectedValue(new Error("Network unavailable"));
    renderCapture(saveSighting);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILURE_MESSAGE);
    });
    expect(
      screen.getByRole("button", { name: "Save label time" })
    ).toBeEnabled();
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText("Label time")).toHaveValue("14:05");
  });
});
