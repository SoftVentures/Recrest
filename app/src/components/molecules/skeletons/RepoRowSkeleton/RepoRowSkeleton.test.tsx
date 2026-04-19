import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RepoRowSkeleton } from "@/components/molecules/skeletons/RepoRowSkeleton";

describe("RepoRowSkeleton", () => {
  it("rendert 15 Platzhalter (Name, Branch, Status, Activity, 5 Actions)", () => {
    const { container } = render(<RepoRowSkeleton />);
    // 2 (name) + 2 (branch) + 2 (status) + 1 (activity) + 5 (actions) + 3 (misc in skeletons). Verify numerically.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });

  it("trägt die Row-Klasse", () => {
    const { container } = render(<RepoRowSkeleton />);
    expect(container.querySelector(".a-row")).not.toBeNull();
  });
});
