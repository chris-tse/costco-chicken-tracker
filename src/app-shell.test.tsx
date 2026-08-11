import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaptureForm } from "./app/index";

describe("Capture route", () => {
  it("opens with only the persistent Capture and Plan destinations", () => {
    render(
      <CaptureForm
        now={() => new Date(2026, 7, 11, 14, 5)}
        saveSighting={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Capture" })).toBeTruthy();
    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(navigation.querySelectorAll("a")).toHaveLength(2);
    expect(navigation).toHaveTextContent("Capture");
    expect(navigation).toHaveTextContent("Plan");
    expect(
      screen.getByRole("button", { name: "Save label time" })
    ).toBeTruthy();
  });
});
