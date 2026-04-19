import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Label } from "@/components/atoms/Label";

describe("Label", () => {
  it("rendert Text", () => {
    render(<Label>Benutzername</Label>);
    expect(screen.getByText("Benutzername")).toBeInTheDocument();
  });

  it("wendet Basisklassen an", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email").className).toContain("text-sm");
    expect(screen.getByText("Email").className).toContain("font-medium");
  });

  it("merged zusätzliche className", () => {
    render(<Label className="custom-label">X</Label>);
    expect(screen.getByText("X")).toHaveClass("custom-label");
  });

  it("unterstützt htmlFor-Prop", () => {
    render(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText("Email")).toHaveAttribute("for", "email-input");
  });
});
