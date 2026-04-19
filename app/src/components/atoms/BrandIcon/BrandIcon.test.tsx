import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandIcon } from "@/components/atoms/BrandIcon";

describe("BrandIcon", () => {
  it("rendert ohne Crash mit slug=github", () => {
    render(<BrandIcon slug="github" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("nimmt die Default-Größe 16", () => {
    const { container } = render(<BrandIcon slug="gitlab" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("wendet custom size an", () => {
    const { container } = render(<BrandIcon slug="bitbucket" size={32} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("32");
  });

  it("nutzt currentColor per Default", () => {
    const { container } = render(<BrandIcon slug="github" />);
    expect(container.querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
  });

  it("setzt Brand-Farbe bei color='brand'", () => {
    const { container } = render(<BrandIcon slug="github" color="brand" />);
    const fill = container.querySelector("svg")?.getAttribute("fill");
    expect(fill).toMatch(/^#[0-9a-fA-F]{3,8}$/);
  });

  it("nutzt title-Prop als aria-label", () => {
    render(<BrandIcon slug="github" title="My GitHub" />);
    expect(screen.getByLabelText("My GitHub")).toBeInTheDocument();
  });
});
