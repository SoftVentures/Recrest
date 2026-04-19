import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchGroupSkeleton } from "@/components/molecules/skeletons/SearchGroupSkeleton";

describe("SearchGroupSkeleton", () => {
  it("rendert Default: Gruppentitel + 3 Hits (à 2 Platzhalter) = 7", () => {
    const { container } = render(<SearchGroupSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(7);
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<SearchGroupSkeleton rows={5} />);
    // 1 title + 5 * 2 = 11
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(11);
  });
});
