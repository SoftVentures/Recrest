import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RepoListSkeleton } from "@/components/molecules/skeletons/RepoListSkeleton";

describe("RepoListSkeleton", () => {
  it("rendert Default: 6 Row-Skeletons + Header", () => {
    const { container } = render(<RepoListSkeleton />);
    expect(container.querySelectorAll(".a-row")).toHaveLength(6);
    expect(container.querySelector(".a-thead")).not.toBeNull();
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<RepoListSkeleton rows={2} />);
    expect(container.querySelectorAll(".a-row")).toHaveLength(2);
  });
});
