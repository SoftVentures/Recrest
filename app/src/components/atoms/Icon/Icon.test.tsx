import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "@/components/atoms/Icon";

describe("Icon", () => {
  it("rendert ein SVG", () => {
    const { container } = render(<Icon name="search" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("hat Default-Größe 16", () => {
    const { container } = render(<Icon name="plus" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("wendet custom size an", () => {
    const { container } = render(<Icon name="check" size={24} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("24");
  });

  it("nutzt currentColor per Default als stroke", () => {
    const { container } = render(<Icon name="x" />);
    expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("currentColor");
  });

  it("wendet custom color als stroke an", () => {
    const { container } = render(<Icon name="x" color="#ff0000" />);
    expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("#ff0000");
  });
});
