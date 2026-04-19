import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "@/components/atoms/Spinner";

describe("Spinner", () => {
  it("rendert mit role=status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("nutzt die md-Größe per Default", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").getAttribute("class")).toContain("h-4");
  });

  it("wendet sm-Größe an", () => {
    render(<Spinner size="sm" />);
    expect(screen.getByRole("status").getAttribute("class")).toContain("h-3.5");
  });

  it("wendet lg-Größe an", () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole("status").getAttribute("class")).toContain("h-6");
  });

  it("setzt aria-label aus label-Prop", () => {
    render(<Spinner label="Lade Daten" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Lade Daten");
  });
});
