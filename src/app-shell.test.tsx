import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaptureForm } from "./app/index";

describe("Capture route", () => {
  it("opens without exposing authentication or unfinished destinations", () => {
    render(
      <CaptureForm
        now={() => new Date(2026, 7, 11, 14, 5)}
        saveSighting={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Capture" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save label time" })
    ).toBeTruthy();
  });
});
