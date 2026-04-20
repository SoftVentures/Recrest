import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BusiestPeakCard } from "@/components/organisms/activity/cards/BusiestPeakCard";
import "@/i18n";
import type { ActivityStats } from "@/lib/activityStats";

function fakeStats(over: Partial<ActivityStats> = {}): ActivityStats {
  return {
    commits: { current: 10, previous: 8, delta: 2 },
    authors: { current: 3, previous: 2, delta: 1 },
    repos: { current: 4, previous: 4, delta: 0 },
    currentStreak: 3,
    longestStreak: 7,
    busiestDay: { label: "Wed", count: 12 },
    peakHour: { label: "14:00–16:00", count: 9 },
    quietestRepos: [],
    ...over,
  };
}

describe("BusiestPeakCard", () => {
  it("shows busiest-day label and peak-hour label", () => {
    render(<BusiestPeakCard stats={fakeStats()} />);
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("14:00–16:00")).toBeInTheDocument();
  });
});
