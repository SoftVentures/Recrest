import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/components/organisms/brand/BrandMark";

describe("BrandMark", () => {
  it("renders two chevron paths", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelectorAll("svg path")).toHaveLength(2);
  });

  it("respects the size prop", () => {
    const { container } = render(<BrandMark size={48} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("48");
  });

  it("uses the supplied stroke colour", () => {
    const { container } = render(<BrandMark stroke="#ff0000" />);
    const g = container.querySelector("g")!;
    expect(g.getAttribute("stroke")).toBe("#ff0000");
  });
});
