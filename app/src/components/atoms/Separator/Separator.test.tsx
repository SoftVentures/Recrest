import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "@/components/atoms/Separator";

describe("Separator", () => {
  it("rendert horizontal per Default", () => {
    const { container } = render(<Separator />);
    const el = container.firstElementChild as HTMLElement | null;
    expect(el?.className).toContain("h-px");
    expect(el?.className).toContain("w-full");
  });

  it("rendert vertikal bei orientation='vertical'", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstElementChild as HTMLElement | null;
    expect(el?.className).toContain("h-full");
    expect(el?.className).toContain("w-px");
  });

  it("merged custom className", () => {
    const { container } = render(<Separator className="my-sep" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("my-sep");
  });

  it("ist per Default decorative (role=none)", () => {
    const { container } = render(<Separator />);
    const role = container.firstElementChild?.getAttribute("role");
    expect(role === "none" || role === null).toBe(true);
  });
});
