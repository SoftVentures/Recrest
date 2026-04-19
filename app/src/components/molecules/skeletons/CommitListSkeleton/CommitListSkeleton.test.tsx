import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";

describe("CommitListSkeleton", () => {
  it("rendert standardmäßig 4 Zeilen (je 5 Platzhalter = 20)", () => {
    const { container } = render(<CommitListSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(20);
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<CommitListSkeleton rows={2} />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(10);
  });
});
