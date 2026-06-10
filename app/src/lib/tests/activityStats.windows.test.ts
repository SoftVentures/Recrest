import type { RecentCommit } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  ACTIVITY_DAYS,
  computeActivityStats,
  computeLeaderboard,
  computeStackedChart,
  currentStreak,
  daysAgo,
  longestStreak,
} from "@/lib/activityStats";

const TODAY = new Date("2026-06-01T00:00:00");

function commit(partial: Partial<RecentCommit> & { author: string }): RecentCommit {
  return {
    sha: partial.sha ?? `sha-${Math.random().toString(36).slice(2, 10)}`,
    summary: partial.summary ?? "test commit",
    author: partial.author,
    authorEmail: partial.authorEmail ?? null,
    timestamp: partial.timestamp ?? "2026-05-31T10:00:00Z",
    repoId: partial.repoId ?? "repo-1",
    repoName: partial.repoName ?? "repo-1",
  };
}

/** Local-time ISO timestamp `n` days before TODAY at noon. */
function isoDaysAgo(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe("daysAgo windowDays", () => {
  it("accepts a custom window", () => {
    expect(daysAgo("2026-04-01T10:00:00Z", TODAY, 90)).toBeGreaterThan(13);
    // Default 14-day window is unchanged: April 1 is far outside it.
    expect(daysAgo("2026-04-01T10:00:00Z", TODAY)).toBe(-1);
  });

  it("keeps the 14-day default identical", () => {
    expect(daysAgo(isoDaysAgo(13), TODAY)).toBe(13);
    expect(daysAgo(isoDaysAgo(14), TODAY)).toBe(-1);
  });
});

describe("currentStreak windowDays", () => {
  it("counts a 20-day streak past the old 14-day cap", () => {
    const commits = Array.from({ length: 20 }, (_, i) =>
      commit({ author: "A", timestamp: isoDaysAgo(i) }),
    );
    // Old 14 cap would clamp to 14.
    expect(currentStreak(commits, TODAY, 30)).toBe(20);
    // Default still clamps to the 14-day window.
    expect(currentStreak(commits, TODAY)).toBe(ACTIVITY_DAYS);
  });
});

describe("longestStreak windowDays", () => {
  it("counts a 20-day streak with a wide window", () => {
    const commits = Array.from({ length: 20 }, (_, i) =>
      commit({ author: "A", timestamp: isoDaysAgo(i) }),
    );
    expect(longestStreak(commits, TODAY, 30)).toBe(20);
    expect(longestStreak(commits, TODAY)).toBe(ACTIVITY_DAYS);
  });
});

describe("computeStackedChart windowDays", () => {
  it("returns windowDays rows", () => {
    const rows = computeStackedChart([], TODAY, 30);
    expect(rows).toHaveLength(30);
    expect(computeStackedChart([], TODAY)).toHaveLength(ACTIVITY_DAYS);
  });

  it("places commits outside the default window into a wider one", () => {
    const c = commit({ author: "A", timestamp: isoDaysAgo(20) });
    const wide = computeStackedChart([c], TODAY, 30);
    expect(wide[20]?.total).toBe(1);
    // Default window drops it entirely.
    const narrow = computeStackedChart([c], TODAY);
    expect(narrow.reduce((sum, d) => sum + d.total, 0)).toBe(0);
  });
});

describe("computeActivityStats windowDays", () => {
  it("includes commits beyond the default window when widened", () => {
    const c = commit({ author: "A", repoId: "repo-1", timestamp: isoDaysAgo(20) });
    const wide = computeActivityStats([c], TODAY, ["repo-1"], 30);
    expect(wide.quietestRepos).toHaveLength(0);
    // Default window treats repo-1 as quiet (no in-window commit).
    const narrow = computeActivityStats([c], TODAY, ["repo-1"]);
    expect(narrow.quietestRepos).toEqual(["repo-1"]);
  });
});

describe("computeLeaderboard windowDays", () => {
  it("produces a windowDays-length sparkline and counts out-of-default-window commits", () => {
    const c = commit({ author: "A", authorEmail: "a@example.com", timestamp: isoDaysAgo(20) });
    const wide = computeLeaderboard([c], TODAY, 5, {}, 30);
    expect(wide).toHaveLength(1);
    expect(wide[0]?.sparkline).toHaveLength(30);
    expect(wide[0]?.count).toBe(1);
    // Default window excludes the commit entirely.
    expect(computeLeaderboard([c], TODAY)).toHaveLength(0);
  });
});
