import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemoteRepoListSkeleton } from "@/components/molecules/skeletons/RemoteRepoListSkeleton";

describe("RemoteRepoListSkeleton", () => {
  it("rendert Default: 6 Karten", () => {
    const { container } = render(<RemoteRepoListSkeleton />);
    // 6 cards * 6 placeholders = 36
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(36);
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<RemoteRepoListSkeleton rows={3} />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(18);
  });
});
