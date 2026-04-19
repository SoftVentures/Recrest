import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewerChipsSkeleton } from "@/components/molecules/skeletons/ReviewerChipsSkeleton";

describe("ReviewerChipsSkeleton", () => {
  it("rendert drei Chips", () => {
    const { container } = render(<ReviewerChipsSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<ReviewerChipsSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});
