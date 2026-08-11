import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Home } from "./app/index";

describe("private application shell", () => {
  it("opens without exposing authentication or unfinished destinations", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Chicken Tracking" })
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
