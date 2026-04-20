import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "@/components/organisms/brand/Logo";

describe("Logo", () => {
  it("renders an accessible name", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "Recrest" })).toBeInTheDocument();
  });

  it("supports a custom title", () => {
    render(<Logo title="Recrest beta" />);
    expect(screen.getByRole("img", { name: "Recrest beta" })).toBeInTheDocument();
  });
});
