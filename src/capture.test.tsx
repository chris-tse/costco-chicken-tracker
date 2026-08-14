import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type CreateSighting,
  SAVE_FAILURE_MESSAGE,
  type UpdateSightingDoneness,
} from "@/lib/sightings";

const { mockSaveSighting, mockUseServerFn } = vi.hoisted(() => ({
  mockSaveSighting: vi.fn(),
  mockUseServerFn: vi.fn(),
}));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal()),
  useServerFn: mockUseServerFn,
}));

import { CaptureForm, CapturePage } from "./app/index";

const DEFAULT_CLOCK = new Date(2026, 7, 11, 14, 5);
const SAVED_LABEL_TIME_MESSAGE =
  /Saved label time for August 11, 2026 at 8:00 AM/;
const COMPLETION_LABEL_TIME_MESSAGE =
  /Saved label time for August 11, 2026 at 2:05 PM/;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const createSavedSighting = () => ({
  createdAt: DEFAULT_CLOCK,
  doneness: null,
  id: 1,
  labelDate: "2026-08-11",
  labelMinute: 845,
  updatedAt: DEFAULT_CLOCK,
});

function renderCapture(
  saveSighting: CreateSighting,
  updateSightingDoneness: UpdateSightingDoneness = vi.fn()
): void {
  render(
    <CaptureForm
      now={() => DEFAULT_CLOCK}
      saveSighting={saveSighting}
      updateSightingDoneness={updateSightingDoneness}
    />
  );
}

describe("Capture", () => {
  it("does not read a server-local clock while rendering the hydration-safe pending state", () => {
    const unavailableServerClock = (): Date => {
      throw new Error("The device clock is only available in the browser.");
    };

    const html = renderToString(
      <CaptureForm now={unavailableServerClock} saveSighting={vi.fn()} />
    );

    expect(html).toContain("Preparing capture form");
    expect(html).not.toContain('type="time"');
  });

  it("defaults to the device's local date and minute", () => {
    renderCapture(vi.fn());

    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText("Label time")).toHaveValue("14:05");
  });

  it("hydrates the route with the client-local time after a midnight, month, and year boundary", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));
    mockUseServerFn.mockReturnValue(mockSaveSighting);

    const serverHtml = renderToString(<CapturePage />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);

    expect(container).toHaveTextContent("Preparing capture form");
    expect(container.querySelector('input[type="time"]')).toBeNull();

    vi.advanceTimersByTime(60_000);

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <CapturePage />);
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Label date")).toHaveValue("2027-01-01");
    expect(screen.getByLabelText("Label time")).toHaveValue("00:00");

    await act(() => {
      root?.unmount();
    });
    vi.unstubAllGlobals();

    expect(screen.queryByLabelText("Label date")).toBeNull();
  });

  it("submits through the CapturePage server-function wiring", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DEFAULT_CLOCK);
    mockUseServerFn.mockReturnValue(mockSaveSighting);
    mockSaveSighting.mockResolvedValue({
      ok: true,
      sighting: {
        createdAt: DEFAULT_CLOCK,
        doneness: null,
        id: 1,
        labelDate: "2026-08-11",
        labelMinute: 845,
        updatedAt: DEFAULT_CLOCK,
      },
    });

    render(<CapturePage />);

    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    fireEvent.submit(screen.getByRole("form", { name: "Capture label time" }));
    await Promise.resolve();

    expect(mockSaveSighting).toHaveBeenCalledWith({
      data: { labelDate: "2026-08-11", labelMinute: 845 },
    });
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
    await waitFor(() => {
      expect(screen.getByText(SAVED_LABEL_TIME_MESSAGE)).toBeTruthy();
    });
  });

  it("submits when Enter is pressed from a label field", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: {
        createdAt: new Date("2026-08-11T19:05:00.000Z"),
        doneness: null,
        id: 1,
        labelDate: "2026-08-11",
        labelMinute: 845,
        updatedAt: new Date("2026-08-11T19:05:00.000Z"),
      },
    });
    renderCapture(saveSighting);

    fireEvent.submit(screen.getByRole("form", { name: "Capture label time" }));

    await waitFor(() => {
      expect(saveSighting).toHaveBeenCalledWith({
        labelDate: "2026-08-11",
        labelMinute: 845,
      });
    });
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

  it("shows full-screen completion only after label time is durably created", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    renderCapture(saveSighting);

    expect(screen.getByRole("heading", { name: "Capture" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));

    const completionHeading = await screen.findByRole("heading", {
      name: "Sighting saved",
    });
    await waitFor(() => {
      expect(completionHeading).toHaveFocus();
    });
    expect(completionHeading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText(COMPLETION_LABEL_TIME_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Capture" })).toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("immediately persists a selected doneness while completion stays open", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi.fn().mockResolvedValue({
      ok: true,
      sighting: { ...createSavedSighting(), doneness: "medium" as const },
    });
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Medium" }));

    await waitFor(() => {
      expect(updateSightingDoneness).toHaveBeenCalledWith(
        {
          doneness: "medium",
          id: 1,
        },
        { signal: expect.any(AbortSignal) }
      );
    });
    expect(screen.getByRole("button", { name: "Medium" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Doneness saved as medium."
    );
    expect(
      screen.getByRole("heading", { name: "Sighting saved" })
    ).toBeTruthy();
  });

  it("clears selected doneness by storing null", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: { ...createSavedSighting(), doneness: "dark" as const },
    });
    const updateSightingDoneness = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Clear doneness" }));

    await waitFor(() => {
      expect(updateSightingDoneness).toHaveBeenCalledWith(
        {
          doneness: null,
          id: 1,
        },
        { signal: expect.any(AbortSignal) }
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("Doneness cleared.");
  });

  it("keeps the saved sighting recoverable when optional enrichment fails", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi.fn().mockResolvedValue({
      kind: "unavailable",
      message: "Unable to save doneness. Try again.",
      ok: false,
    });
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Light" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "label time remains saved"
      );
    });
    expect(
      screen.getByRole("heading", { name: "Sighting saved" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stops waiting for optional enrichment after five seconds", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi.fn(
      (_input, options?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Request timed out", "AbortError"));
          });
        })
    );
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Light" }));

    expect(screen.getByRole("status")).toHaveTextContent("Saving doneness…");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to save doneness. Try again. The label time remains saved."
    );
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled();
  });

  it("keeps a not-found response distinct from a saved-sighting failure", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi.fn().mockResolvedValue({
      kind: "not-found",
      message: "This sighting is no longer available.",
      ok: false,
    });
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This sighting is no longer available"
      );
    });
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "label time remains saved"
    );
  });

  it("keeps completion open when an enrichment request rejects", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi
      .fn()
      .mockRejectedValue(new Error("Network unavailable"));
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "label time remains saved"
      );
    });
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });

  it("returns to fresh Capture without enriching when Done is selected", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const updateSightingDoneness = vi.fn();
    renderCapture(saveSighting, updateSightingDoneness);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(updateSightingDoneness).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Capture" })).toBeTruthy();
    expect(screen.getByLabelText("Label date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText("Label time")).toHaveValue("14:05");
  });

  it("opens the identity-addressed correction flow from completion", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const onOpenCompletionCorrection = vi.fn();
    render(
      <CaptureForm
        now={() => DEFAULT_CLOCK}
        onOpenCompletionCorrection={onOpenCompletionCorrection}
        saveSighting={saveSighting}
        updateSightingDoneness={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(
      screen.getByRole("button", { name: "Correct this sighting" })
    );

    expect(onOpenCompletionCorrection).toHaveBeenCalledWith(1);
  });

  it("keeps completion available when opening its correction rejects", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    const onOpenCompletionCorrection = vi
      .fn<(id: number) => Promise<void>>()
      .mockRejectedValue(new Error("Navigation unavailable"));
    render(
      <CaptureForm
        now={() => DEFAULT_CLOCK}
        onOpenCompletionCorrection={onOpenCompletionCorrection}
        saveSighting={saveSighting}
        updateSightingDoneness={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    fireEvent.click(
      screen.getByRole("button", { name: "Correct this sighting" })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to open this correction. Try again."
      );
    });
    expect(onOpenCompletionCorrection).toHaveBeenCalledWith(1);
    expect(
      screen.getByRole("heading", { name: "Sighting saved" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Correct this sighting" })
    ).toBeEnabled();
  });

  it("leaves the durable creation intact when completion is interrupted", async () => {
    const saveSighting = vi.fn().mockResolvedValue({
      ok: true,
      sighting: createSavedSighting(),
    });
    renderCapture(saveSighting);

    fireEvent.click(screen.getByRole("button", { name: "Save label time" }));
    await screen.findByRole("heading", { name: "Sighting saved" });
    cleanup();

    expect(saveSighting).toHaveBeenCalledTimes(1);
    expect(saveSighting).toHaveBeenCalledWith({
      labelDate: "2026-08-11",
      labelMinute: 845,
    });
  });
});
