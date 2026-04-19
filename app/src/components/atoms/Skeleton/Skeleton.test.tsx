import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "@/components/atoms/Skeleton";

describe("Skeleton", () => {
  it("rendert einen div", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("wendet Pulse- und Muted-Klassen an", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("bg-muted");
  });

  it("merged zusätzliche className", () => {
    const { container } = render(<Skeleton className="h-8 w-40" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("w-40");
  });

  it("wendet inline-style an", () => {
    const { container } = render(<Skeleton style={{ width: 120 }} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe("120px");
  });

  it("ist aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});
