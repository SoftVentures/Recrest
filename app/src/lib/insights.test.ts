import type { RecentCommit } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  computeAvgCommitsPerWeek,
  computeLongestGap,
  computeMostActiveDayOfWeek,
  computeStreaks,
  computeTopAuthorsByPeriod,
  computeTrend,
} from "@/lib/insights";

const c = (ts: string, author = "alice"): RecentCommit => ({
  sha: ts + author,
  summary: "s",
  author,
  authorEmail: null,
  timestamp: ts,
  repoId: "r",
  repoName: "repo",
});

const TODAY = new Date("2026-06-01T12:00:00");

describe("computeStreaks", () => {
  it("handles empty input", () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, longest: 0, longestRange: null });
  });

  it("counts a current streak ending today", () => {
    const commits = [
      c("2026-06-01T08:00:00Z"),
      c("2026-05-31T08:00:00Z"),
      c("2026-05-30T08:00:00Z"),
    ];
    expect(computeStreaks(commits, TODAY).current).toBe(3);
  });

  it("current streak breaks on a gap day", () => {
    const commits = [c("2026-06-01T08:00:00Z"), c("2026-05-30T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).current).toBe(1);
  });

  it("keeps the current streak alive when today has no commit yet", () => {
    const commits = [c("2026-05-31T08:00:00Z"), c("2026-05-30T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).current).toBe(2);
  });

  it("finds the longest historical streak with its range", () => {
    const commits = [
      c("2026-03-01T08:00:00Z"),
      c("2026-03-02T08:00:00Z"),
      c("2026-03-03T08:00:00Z"),
      c("2026-03-04T08:00:00Z"),
      c("2026-06-01T08:00:00Z"),
    ];
    const { longest, longestRange } = computeStreaks(commits, TODAY);
    expect(longest).toBe(4);
    expect(longestRange).toEqual({ start: "2026-03-01", end: "2026-03-04" });
  });

  it("buckets UTC evening commits into the local (Berlin) next day", () => {
    // 23:30 UTC = 01:30 Berlin (CEST) next day.
    const commits = [c("2026-05-31T23:30:00Z"), c("2026-06-01T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).current).toBe(1); // both on local 2026-06-01
  });

  it("longest is 1 when no two commits are consecutive", () => {
    const commits = [c("2026-05-01T08:00:00Z"), c("2026-05-10T08:00:00Z")];
    expect(computeStreaks(commits, TODAY).longest).toBe(1);
  });
});

describe("computeTrend", () => {
  it("flags up when this period beats the previous by >=5%", () => {
    const commits = [
      c("2026-05-31T08:00:00Z"),
      c("2026-05-30T08:00:00Z"),
      c("2026-05-29T08:00:00Z"),
      c("2026-05-23T08:00:00Z"),
    ];
    const trend = computeTrend(commits, 7, TODAY);
    expect(trend.direction).toBe("up");
    expect(trend.deltaPct).toBeGreaterThan(5);
  });

  it("flags down on a drop", () => {
    const commits = [
      c("2026-05-31T08:00:00Z"),
      c("2026-05-23T08:00:00Z"),
      c("2026-05-22T08:00:00Z"),
      c("2026-05-21T08:00:00Z"),
    ];
    expect(computeTrend(commits, 7, TODAY).direction).toBe("down");
  });

  it("is flat below the 5% threshold", () => {
    const commits = [c("2026-05-30T08:00:00Z"), c("2026-05-22T08:00:00Z")];
    expect(computeTrend(commits, 7, TODAY).direction).toBe("flat");
  });

  it("reports 100% up from a zero previous period with current commits", () => {
    const commits = [c("2026-05-30T08:00:00Z")];
    const t = computeTrend(commits, 7, TODAY);
    expect(t.direction).toBe("up");
    expect(t.deltaPct).toBe(100);
  });

  it("is flat when both periods are empty", () => {
    expect(computeTrend([], 7, TODAY)).toEqual({ direction: "flat", deltaPct: 0 });
  });
});

describe("computeTopAuthorsByPeriod", () => {
  it("ranks authors by commit count inside the period", () => {
    const commits = [
      c("2026-05-30T08:00:00Z", "bob"),
      c("2026-05-30T09:00:00Z", "bob"),
      c("2026-05-30T10:00:00Z", "alice"),
      c("2026-01-01T10:00:00Z", "carol"),
    ];
    const top = computeTopAuthorsByPeriod(commits, 30, 2, TODAY);
    expect(top.map((a) => a.author)).toEqual(["bob", "alice"]);
    expect(top[0]?.count).toBe(2);
  });

  it("applies the limit", () => {
    const commits = [c("2026-05-30T08:00:00Z", "a"), c("2026-05-30T09:00:00Z", "b")];
    expect(computeTopAuthorsByPeriod(commits, 30, 1, TODAY)).toHaveLength(1);
  });
});

describe("computeMostActiveDayOfWeek", () => {
  it("returns local weekday index with count", () => {
    // 2026-05-25 is a Monday.
    const commits = [
      c("2026-05-25T08:00:00Z"),
      c("2026-05-25T09:00:00Z"),
      c("2026-05-26T08:00:00Z"),
    ];
    expect(computeMostActiveDayOfWeek(commits)).toEqual({ day: 1, count: 2 }); // 1 = Monday (JS getDay)
  });

  it("returns null for empty input", () => {
    expect(computeMostActiveDayOfWeek([])).toBeNull();
  });
});

describe("computeAvgCommitsPerWeek", () => {
  it("averages over the spanned weeks", () => {
    const commits = [
      c("2026-05-18T08:00:00Z"),
      c("2026-05-25T08:00:00Z"),
      c("2026-06-01T08:00:00Z"),
    ];
    // 3 commits over a 15-local-day span (inclusive) → 15/7 weeks → 1.4
    expect(computeAvgCommitsPerWeek(commits)).toBeCloseTo(3 / (15 / 7), 5);
  });

  it("returns 0 for empty input", () => {
    expect(computeAvgCommitsPerWeek([])).toBe(0);
  });

  it("single commit counts as one week", () => {
    expect(computeAvgCommitsPerWeek([c("2026-05-18T08:00:00Z")])).toBe(1);
  });
});

describe("computeLongestGap", () => {
  it("finds the longest run of local days without a commit", () => {
    const commits = [
      c("2026-05-01T08:00:00Z"),
      c("2026-05-10T08:00:00Z"),
      c("2026-05-12T08:00:00Z"),
    ];
    expect(computeLongestGap(commits)).toEqual({
      startDate: "2026-05-02",
      endDate: "2026-05-09",
      days: 8,
    });
  });

  it("returns null when there is no gap or fewer than 2 commits", () => {
    expect(computeLongestGap([c("2026-05-01T08:00:00Z")])).toBeNull();
    expect(computeLongestGap([c("2026-05-01T08:00:00Z"), c("2026-05-02T08:00:00Z")])).toBeNull();
  });
});
