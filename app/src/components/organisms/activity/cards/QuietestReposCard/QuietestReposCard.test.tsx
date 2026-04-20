import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuietestReposCard } from "@/components/organisms/activity/cards/QuietestReposCard";
import { fakeRepo } from "@/components/organisms/activity/cards/_fixtures";
import "@/i18n";

describe("QuietestReposCard", () => {
  it("renders a chip per quiet repo", () => {
    const map = new Map([
      ["r1", fakeRepo("r1")],
      ["r2", fakeRepo("r2")],
    ]);
    render(<QuietestReposCard quietestRepoIds={["r1", "r2"]} reposById={map} />);
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByText("r2")).toBeInTheDocument();
  });

  it("renders the empty-state message", () => {
    render(<QuietestReposCard quietestRepoIds={[]} reposById={new Map()} />);
    expect(screen.getByText(/Every repo/i)).toBeInTheDocument();
  });
});
