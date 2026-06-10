import type { ActivityRange, RecentCommit } from "@recrest/shared";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bucketCommits,
  bucketCommitsByRepo,
  bucketUnitForWindow,
  windowDaysOf,
} from "@/lib/activity/rangeBuckets";

afterEach(() => {
  vi.useRealTimers();
});

const NOW = new Date("2026-06-09T12:00:00.000Z");

function rangeOfDays(days: number): ActivityRange {
  return {
    since: new Date(NOW.getTime() - days * 86_400_000).toISOString(),
    until: NOW.toISOString(),
  };
}

function commit(repoId: string, daysAgo: number): RecentCommit {
  return {
    sha: `${repoId}-${daysAgo}-${Math.random().toString(36).slice(2)}`,
    summary: "c",
    author: "a",
    authorEmail: null,
    timestamp: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    repoId,
  } as RecentCommit;
}

describe("windowDaysOf", () => {
  it("rounds the span up to whole days, never below 1", () => {
    expect(windowDaysOf(rangeOfDays(14))).toBe(14);
    expect(windowDaysOf(rangeOfDays(0))).toBe(1);
  });
});

describe("bucketUnitForWindow", () => {
  it("scales granularity with the window width", () => {
    expect(bucketUnitForWindow(7)).toBe("day");
    expect(bucketUnitForWindow(30)).toBe("day");
    expect(bucketUnitForWindow(90)).toBe("week");
    expect(bucketUnitForWindow(180)).toBe("week");
    expect(bucketUnitForWindow(365)).toBe("month");
  });
});

describe("bucketCommits", () => {
  it("buckets daily for short windows, newest bucket last", () => {
    vi.setSystemTime(NOW);
    const commits = [commit("r1", 0), commit("r1", 0), commit("r1", 13)];
    const { buckets, unit, windowDays } = bucketCommits(commits, rangeOfDays(14));

    expect(unit).toBe("day");
    expect(windowDays).toBe(14);
    expect(buckets).toHaveLength(14);
    expect(buckets[buckets.length - 1]).toBe(2); // today
    expect(buckets[0]).toBe(1); // 13 days ago
  });

  it("drops commits outside the window", () => {
    vi.setSystemTime(NOW);
    const { buckets } = bucketCommits([commit("r1", 99)], rangeOfDays(14));
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("collapses to weekly buckets for a 90-day window", () => {
    vi.setSystemTime(NOW);
    const { buckets, unit } = bucketCommits([commit("r1", 0)], rangeOfDays(90));
    expect(unit).toBe("week");
    expect(buckets).toHaveLength(Math.ceil(90 / 7));
  });
});

describe("bucketCommitsByRepo", () => {
  it("produces one series per repo, each window-length", () => {
    vi.setSystemTime(NOW);
    const commits = [commit("r1", 0), commit("r2", 1), commit("r2", 1)];
    const { byRepo } = bucketCommitsByRepo(commits, rangeOfDays(14));

    expect([...byRepo.keys()].sort()).toEqual(["r1", "r2"]);
    expect(byRepo.get("r1")?.at(-1)).toBe(1);
    expect(byRepo.get("r2")?.reduce((a, b) => a + b, 0)).toBe(2);
  });
});
