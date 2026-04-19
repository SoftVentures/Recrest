import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sparkline } from "@/components/atoms/Sparkline";

describe("Sparkline", () => {
  it("rendert .spark container", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    expect(container.querySelector(".spark")).not.toBeNull();
  });

  it("rendert einen Balken pro Datenpunkt", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    const bars = container.querySelectorAll(".spark > span");
    expect(bars.length).toBe(5);
  });

  it("markiert Null-Werte mit .zero Klasse", () => {
    const { container } = render(<Sparkline data={[0, 1, 0, 2]} />);
    expect(container.querySelectorAll(".zero").length).toBe(2);
  });

  it("fügt .active Klasse im active-Mode hinzu", () => {
    const { container } = render(<Sparkline data={[1, 2]} active />);
    expect(container.querySelector(".spark.active")).not.toBeNull();
  });

  it("wendet width/height aus Props an", () => {
    const { container } = render(<Sparkline data={[1, 2]} width={100} height={24} />);
    const el = container.querySelector<HTMLDivElement>(".spark");
    expect(el?.style.width).toBe("100px");
    expect(el?.style.height).toBe("24px");
  });
});
