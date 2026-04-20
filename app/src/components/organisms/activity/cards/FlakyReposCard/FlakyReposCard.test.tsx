import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlakyReposCard } from "@/components/organisms/activity/cards/FlakyReposCard";
import "@/i18n";

describe("FlakyReposCard", () => {
  it("renders the repo name and failure percentage", () => {
    render(
      <FlakyReposCard
        rows={[{ repoId: "r1", repoName: "flaky-svc", failRate: 0.42, failed: 21, total: 50 }]}
      />,
    );
    expect(screen.getByText("flaky-svc")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<FlakyReposCard rows={[]} />);
    expect(screen.getByText(/No check-run data/i)).toBeInTheDocument();
  });
});
