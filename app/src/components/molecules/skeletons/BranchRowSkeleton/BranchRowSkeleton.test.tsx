import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BranchRowSkeleton } from "@/components/molecules/skeletons/BranchRowSkeleton";

describe("BranchRowSkeleton", () => {
  it("rendert fünf Platzhalter-Elemente", () => {
    const { container } = render(<BranchRowSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<BranchRowSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});
