import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityBarsSkeleton } from "@/components/molecules/skeletons/ActivityBarsSkeleton";

describe("ActivityBarsSkeleton", () => {
  it("rendert 14 Bar-Platzhalter", () => {
    const { container } = render(<ActivityBarsSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(14);
  });

  it("markiert das Wrapper-Element als aria-hidden", () => {
    const { container } = render(<ActivityBarsSkeleton />);
    expect(container.querySelector(".a-dash-chart")).toHaveAttribute("aria-hidden");
  });
});
