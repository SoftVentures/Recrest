import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { ReviewQueueCard } from "@/components/organisms/activity/cards/ReviewQueueCard";
import "@/i18n";

describe("ReviewQueueCard", () => {
  it("renders the oldest PR title first", () => {
    render(
      <TooltipProvider>
        <ReviewQueueCard
          entries={[
            {
              repoId: "r1",
              repoName: "app",
              number: 1,
              title: "old feature",
              author: "alice",
              url: "https://example.com/1",
              openedAt: "2026-04-01T00:00:00Z",
              ageDays: 19,
            },
          ]}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("old feature")).toBeInTheDocument();
  });

  it("renders empty state when there is nothing to review", () => {
    render(
      <TooltipProvider>
        <ReviewQueueCard entries={[]} />
      </TooltipProvider>,
    );
    expect(screen.getByText(/No open PRs/i)).toBeInTheDocument();
  });
});
