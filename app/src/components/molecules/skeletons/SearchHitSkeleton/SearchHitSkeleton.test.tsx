import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchHitSkeleton } from "@/components/molecules/skeletons/SearchHitSkeleton";

describe("SearchHitSkeleton", () => {
  it("rendert zwei Platzhalter", () => {
    const { container } = render(<SearchHitSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<SearchHitSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});
