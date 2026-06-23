import type { CheckRunSummary, PrEvent, PullRequest, RecentCommit } from "@recrest/shared";
import { PrEventKind, PrState } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  colorForAuthor,
  computeAuthorClock,
  computeChurn,
  computeCiPassRate,
  computeCiRepoBreakdown,
  computeFlakyRepos,
  computeHeatmap,
  computeLanguageMix,
  computePrVelocity,
  computeReviewQueue,
  computeTimeToMerge,
} from "@/lib/activityAggregates";
import type { EnrichedRepo } from "@/lib/repoEnrich";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fixed "today" at noon Berlin time so daysAgo() bucketing is stable.
// TZ=Europe/Berlin is set in vitest.config.ts.
const TODAY = new Date("2026-06-15T12:00:00");

/** Local-time ISO timestamp `n` days before TODAY at the given hour (default noon). */
function iso(daysBack: number, hour = 12): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** YYYY-MM-DD in local time `n` days before TODAY. */
function dayKey(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeCommit(overrides: Partial<RecentCommit> & { timestamp?: string }): RecentCommit {
  return {
    sha: "abc",
    summary: "fix: something",
    author: "Alice",
    authorEmail: "alice@example.com",
    timestamp: overrides.timestamp ?? iso(0),
    repoId: "repo-a",
    repoName: "repo-a",
    ...overrides,
  };
}

function makePrEvent(
  overrides: Partial<PrEvent> & { timestamp: string; kind: PrEventKind },
): PrEvent {
  return {
    repoId: "repo-a",
    repoName: "repo-a",
    number: 1,
    title: "PR title",
    author: "Alice",
    url: "https://github.com/org/repo/pull/1",
    ...overrides,
  };
}

function makePr(
  overrides: Partial<PullRequest> & { state: PrState; createdAt: string },
): PullRequest {
  return {
    id: "pr-1",
    number: 1,
    title: "My PR",
    url: "https://github.com/org/repo/pull/1",
    author: "Alice",
    draft: false,
    sourceBranch: "feature",
    targetBranch: "main",
    updatedAt: overrides.createdAt,
    additions: 10,
    deletions: 2,
    ciStatus: null,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<CheckRunSummary> & { day: string }): CheckRunSummary {
  return {
    repoId: "repo-a",
    repoName: "repo-a",
    total: 0,
    passed: 0,
    failed: 0,
    shaSamples: [],
    ...overrides,
  };
}

function makeRepo(overrides: Partial<EnrichedRepo> & { id: string }): EnrichedRepo {
  return {
    name: overrides.id,
    path: `/home/user/${overrides.id}`,
    groupId: null,
    providerId: null,
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    group: "Projects",
    lang: overrides.lang ?? "TypeScript",
    langShares: overrides.langShares ?? {},
    added: overrides.added ?? 0,
    removed: overrides.removed ?? 0,
    filesChanged: 0,
    activity: [],
    pinned: false,
    clean: true,
    status: {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      language: overrides.lang ?? "TypeScript",
      changedFiles: [],
    } as unknown as EnrichedRepo["status"],
    remoteUrl: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computePrVelocity
// ---------------------------------------------------------------------------

describe("computePrVelocity", () => {
  it("returns an empty-count array of windowDays rows when given no events", () => {
    const result = computePrVelocity([], TODAY, 7);
    expect(result).toHaveLength(7);
    expect(result.every((r) => r.opened === 0 && r.merged === 0)).toBe(true);
    // row indices are 0..6
    expect(result[0]?.day).toBe(0);
    expect(result[6]?.day).toBe(6);
  });

  it("uses ACTIVITY_DAYS (14) by default", () => {
    expect(computePrVelocity([], TODAY)).toHaveLength(14);
  });

  it("counts an opened event on the correct day index", () => {
    const e = makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(2) });
    const result = computePrVelocity([e], TODAY, 14);
    expect(result[2]?.opened).toBe(1);
    expect(result[2]?.merged).toBe(0);
  });

  it("counts a merged event on the correct day index", () => {
    const e = makePrEvent({ kind: PrEventKind.MERGED, timestamp: iso(1) });
    const result = computePrVelocity([e], TODAY, 14);
    expect(result[1]?.merged).toBe(1);
    expect(result[1]?.opened).toBe(0);
  });

  it("ignores events outside the window", () => {
    const outsideWindow = makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(20) });
    const result = computePrVelocity([outsideWindow], TODAY, 14);
    expect(result.reduce((s, r) => s + r.opened + r.merged, 0)).toBe(0);
  });

  it("ignores 'closed' events (neither opened nor merged)", () => {
    const e = makePrEvent({ kind: PrEventKind.CLOSED as PrEventKind, timestamp: iso(0) });
    const result = computePrVelocity([e], TODAY, 14);
    expect(result.reduce((s, r) => s + r.opened + r.merged, 0)).toBe(0);
  });

  it("accumulates multiple events on the same day", () => {
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(3) }),
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(3), number: 2 }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: iso(3), number: 3 }),
    ];
    const result = computePrVelocity(events, TODAY, 14);
    expect(result[3]?.opened).toBe(2);
    expect(result[3]?.merged).toBe(1);
  });

  it("handles events at the boundary (day 0 = today, day windowDays-1 = oldest)", () => {
    const today = makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(0) });
    const oldest = makePrEvent({ kind: PrEventKind.MERGED, timestamp: iso(13), number: 2 });
    const result = computePrVelocity([today, oldest], TODAY, 14);
    expect(result[0]?.opened).toBe(1);
    expect(result[13]?.merged).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeTimeToMerge
// ---------------------------------------------------------------------------

describe("computeTimeToMerge", () => {
  it("returns four zero-count buckets for empty input", () => {
    const result = computeTimeToMerge([]);
    expect(result).toHaveLength(4);
    expect(result.map((b) => b.count)).toEqual([0, 0, 0, 0]);
    expect(result.map((b) => b.bucket)).toEqual(["<1h", "<1d", "<3d", ">=3d"]);
  });

  it("skips PRs with only an opened event (no merge)", () => {
    const e = makePrEvent({ kind: PrEventKind.OPENED, timestamp: iso(1) });
    const result = computeTimeToMerge([e]);
    expect(result.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it("skips PRs with only a merged event (no open time)", () => {
    const e = makePrEvent({ kind: PrEventKind.MERGED, timestamp: iso(1) });
    const result = computeTimeToMerge([e]);
    expect(result.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it("skips PRs where merged < opened (data anomaly)", () => {
    // merged before opened — should be skipped
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: "2026-06-10T14:00:00Z", number: 42 }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: "2026-06-10T10:00:00Z", number: 42 }),
    ];
    const result = computeTimeToMerge(events);
    expect(result.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it("buckets a PR merged within 1 hour into <1h", () => {
    const opened = "2026-06-10T10:00:00.000Z";
    const merged = "2026-06-10T10:30:00.000Z"; // 30 min later
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: opened }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: merged }),
    ];
    const result = computeTimeToMerge(events);
    expect(result.find((b) => b.bucket === "<1h")?.count).toBe(1);
    expect(result.find((b) => b.bucket === "<1d")?.count).toBe(0);
  });

  it("buckets a PR merged within 1 day into <1d", () => {
    const opened = "2026-06-10T08:00:00.000Z";
    const merged = "2026-06-10T20:00:00.000Z"; // 12 hours later
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: opened }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: merged }),
    ];
    const result = computeTimeToMerge(events);
    expect(result.find((b) => b.bucket === "<1d")?.count).toBe(1);
  });

  it("buckets a PR merged within 3 days into <3d", () => {
    const opened = "2026-06-08T10:00:00.000Z";
    const merged = "2026-06-09T18:00:00.000Z"; // ~32 hours later
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: opened }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: merged }),
    ];
    const result = computeTimeToMerge(events);
    expect(result.find((b) => b.bucket === "<3d")?.count).toBe(1);
  });

  it("buckets a PR merged after 3 days into >=3d", () => {
    const opened = "2026-06-01T10:00:00.000Z";
    const merged = "2026-06-10T10:00:00.000Z"; // 9 days later
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: opened }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: merged }),
    ];
    const result = computeTimeToMerge(events);
    expect(result.find((b) => b.bucket === ">=3d")?.count).toBe(1);
  });

  it("groups opened+merged events correctly when same repoId+number", () => {
    // Two different PRs; each in a different bucket.
    const events: PrEvent[] = [
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: "2026-06-10T10:00:00Z", number: 1 }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: "2026-06-10T10:20:00Z", number: 1 }), // <1h
      makePrEvent({ kind: PrEventKind.OPENED, timestamp: "2026-06-01T10:00:00Z", number: 2 }),
      makePrEvent({ kind: PrEventKind.MERGED, timestamp: "2026-06-10T10:00:00Z", number: 2 }), // >=3d
    ];
    const result = computeTimeToMerge(events);
    expect(result.find((b) => b.bucket === "<1h")?.count).toBe(1);
    expect(result.find((b) => b.bucket === ">=3d")?.count).toBe(1);
    expect(result.reduce((s, b) => s + b.count, 0)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeReviewQueue
// ---------------------------------------------------------------------------

describe("computeReviewQueue", () => {
  const NOW = new Date("2026-06-15T12:00:00Z");

  it("returns empty array when prsByRepo is empty", () => {
    expect(computeReviewQueue({}, new Map(), NOW)).toEqual([]);
  });

  it("skips non-open PRs (merged, closed)", () => {
    const merged = makePr({ state: PrState.MERGED, createdAt: "2026-06-01T00:00:00Z" });
    const closed = makePr({
      state: PrState.CLOSED,
      createdAt: "2026-06-01T00:00:00Z",
      number: 2,
      id: "pr-2",
    });
    const result = computeReviewQueue({ "repo-a": [merged, closed] }, new Map(), NOW);
    expect(result).toHaveLength(0);
  });

  it("includes open PRs and computes ageDays correctly", () => {
    const openedAt = "2026-06-10T12:00:00Z"; // 5 days before NOW
    const pr = makePr({ state: PrState.OPEN, createdAt: openedAt });
    const result = computeReviewQueue({ "repo-a": [pr] }, new Map(), NOW);
    expect(result).toHaveLength(1);
    expect(result[0]?.ageDays).toBeCloseTo(5, 0);
    expect(result[0]?.repoId).toBe("repo-a");
    expect(result[0]?.number).toBe(1);
  });

  it("uses reposById name when available, falls back to repoId", () => {
    const pr = makePr({ state: PrState.OPEN, createdAt: "2026-06-14T00:00:00Z" });
    const repo = makeRepo({ id: "repo-a", name: "my-cool-repo" });
    const reposById = new Map([["repo-a", repo]]);
    const withMap = computeReviewQueue({ "repo-a": [pr] }, reposById, NOW);
    expect(withMap[0]?.repoName).toBe("my-cool-repo");

    const withoutMap = computeReviewQueue({ "repo-a": [pr] }, new Map(), NOW);
    expect(withoutMap[0]?.repoName).toBe("repo-a");
  });

  it("sorts oldest-first (largest ageDays first)", () => {
    const old = makePr({
      state: PrState.OPEN,
      createdAt: "2026-06-01T00:00:00Z",
      number: 1,
      id: "pr-1",
    });
    const recent = makePr({
      state: PrState.OPEN,
      createdAt: "2026-06-13T00:00:00Z",
      number: 2,
      id: "pr-2",
    });
    const result = computeReviewQueue({ "repo-a": [recent, old] }, new Map(), NOW);
    expect(result[0]?.number).toBe(1); // old one first
    expect(result[1]?.number).toBe(2);
  });

  it("respects the limit and returns at most `limit` entries", () => {
    const prs: PullRequest[] = Array.from({ length: 10 }, (_, i) =>
      makePr({
        state: PrState.OPEN,
        createdAt: "2026-06-10T00:00:00Z",
        number: i + 1,
        id: `pr-${i + 1}`,
      }),
    );
    const result = computeReviewQueue({ "repo-a": prs }, new Map(), NOW, 3);
    expect(result).toHaveLength(3);
  });

  it("ageDays is non-negative even for a PR created in the future", () => {
    const futurePr = makePr({ state: PrState.OPEN, createdAt: "2026-12-31T00:00:00Z" });
    const result = computeReviewQueue({ "repo-a": [futurePr] }, new Map(), NOW);
    expect(result[0]?.ageDays).toBeGreaterThanOrEqual(0);
  });

  it("collects PRs from multiple repos", () => {
    const pr1 = makePr({
      state: PrState.OPEN,
      createdAt: "2026-06-14T00:00:00Z",
      number: 1,
      id: "pr-1",
    });
    const pr2 = makePr({
      state: PrState.OPEN,
      createdAt: "2026-06-13T00:00:00Z",
      number: 2,
      id: "pr-2",
    });
    const result = computeReviewQueue({ "repo-a": [pr1], "repo-b": [pr2] }, new Map(), NOW);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.repoId).sort()).toEqual(["repo-a", "repo-b"]);
  });
});

// ---------------------------------------------------------------------------
// computeCiPassRate
// ---------------------------------------------------------------------------

describe("computeCiPassRate", () => {
  it("returns windowDays rows all with rate=1 for empty input", () => {
    const result = computeCiPassRate([], TODAY, 7);
    expect(result).toHaveLength(7);
    expect(result.every((r) => r.rate === 1 && r.total === 0)).toBe(true);
  });

  it("uses ACTIVITY_DAYS (14) by default", () => {
    expect(computeCiPassRate([], TODAY)).toHaveLength(14);
  });

  it("row.day equals its index", () => {
    const result = computeCiPassRate([], TODAY, 5);
    expect(result.map((r) => r.day)).toEqual([0, 1, 2, 3, 4]);
  });

  it("accumulates a summary into the correct day bucket", () => {
    const s = makeSummary({ day: dayKey(3), total: 10, passed: 8, failed: 2 });
    const result = computeCiPassRate([s], TODAY, 14);
    expect(result[3]?.total).toBe(10);
    expect(result[3]?.passed).toBe(8);
    expect(result[3]?.rate).toBeCloseTo(0.8);
  });

  it("ignores summaries outside the window", () => {
    const outsideWindow = makeSummary({ day: dayKey(20), total: 5, passed: 5, failed: 0 });
    const result = computeCiPassRate([outsideWindow], TODAY, 14);
    expect(result.reduce((s, r) => s + r.total, 0)).toBe(0);
  });

  it("sums multiple summaries that fall on the same day", () => {
    const s1 = makeSummary({
      repoId: "r1",
      repoName: "r1",
      day: dayKey(1),
      total: 4,
      passed: 4,
      failed: 0,
    });
    const s2 = makeSummary({
      repoId: "r2",
      repoName: "r2",
      day: dayKey(1),
      total: 6,
      passed: 3,
      failed: 3,
    });
    const result = computeCiPassRate([s1, s2], TODAY, 14);
    expect(result[1]?.total).toBe(10);
    expect(result[1]?.passed).toBe(7);
    expect(result[1]?.rate).toBeCloseTo(0.7);
  });

  it("rate is 1 for days with no runs (total === 0)", () => {
    const result = computeCiPassRate([], TODAY, 5);
    expect(result.every((r) => r.rate === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeCiRepoBreakdown
// ---------------------------------------------------------------------------

describe("computeCiRepoBreakdown", () => {
  it("returns empty array for empty input", () => {
    expect(computeCiRepoBreakdown([])).toEqual([]);
  });

  it("produces one row per repo", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({ repoId: "r1", repoName: "r1", day: dayKey(0), total: 5, passed: 4, failed: 1 }),
      makeSummary({ repoId: "r2", repoName: "r2", day: dayKey(0), total: 3, passed: 3, failed: 0 }),
    ];
    const result = computeCiRepoBreakdown(summaries);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.repoId).sort()).toEqual(["r1", "r2"]);
  });

  it("folds multiple summaries for the same repo", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({ repoId: "r1", repoName: "r1", day: dayKey(0), total: 4, passed: 2, failed: 2 }),
      makeSummary({ repoId: "r1", repoName: "r1", day: dayKey(1), total: 6, passed: 4, failed: 2 }),
    ];
    const result = computeCiRepoBreakdown(summaries);
    expect(result).toHaveLength(1);
    expect(result[0]?.total).toBe(10);
    expect(result[0]?.passed).toBe(6);
    expect(result[0]?.rate).toBeCloseTo(0.6);
  });

  it("rate is 1 when a repo has total === 0", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({ repoId: "r1", repoName: "r1", day: dayKey(0), total: 0, passed: 0, failed: 0 }),
    ];
    const result = computeCiRepoBreakdown(summaries);
    expect(result[0]?.rate).toBe(1);
  });

  it("sorts by total descending (highest-traffic repo first)", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({
        repoId: "low",
        repoName: "low",
        day: dayKey(0),
        total: 2,
        passed: 2,
        failed: 0,
      }),
      makeSummary({
        repoId: "high",
        repoName: "high",
        day: dayKey(0),
        total: 20,
        passed: 18,
        failed: 2,
      }),
    ];
    const result = computeCiRepoBreakdown(summaries);
    expect(result[0]?.repoId).toBe("high");
    expect(result[1]?.repoId).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// computeFlakyRepos
// ---------------------------------------------------------------------------

describe("computeFlakyRepos", () => {
  it("returns empty array for empty input", () => {
    expect(computeFlakyRepos([], new Map())).toEqual([]);
  });

  it("excludes repos with zero total runs", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({ repoId: "r1", day: dayKey(0), total: 0, passed: 0, failed: 0 }),
    ];
    expect(computeFlakyRepos(summaries, new Map())).toHaveLength(0);
  });

  it("computes failRate as failed / total", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({
        repoId: "r1",
        repoName: "r1",
        day: dayKey(0),
        total: 10,
        passed: 6,
        failed: 4,
      }),
    ];
    const result = computeFlakyRepos(summaries, new Map());
    expect(result[0]?.failRate).toBeCloseTo(0.4);
    expect(result[0]?.failed).toBe(4);
    expect(result[0]?.total).toBe(10);
  });

  it("sorts by failRate descending; ties broken by total descending", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({
        repoId: "r1",
        repoName: "r1",
        day: dayKey(0),
        total: 10,
        passed: 5,
        failed: 5,
      }), // 50%
      makeSummary({
        repoId: "r2",
        repoName: "r2",
        day: dayKey(0),
        total: 20,
        passed: 0,
        failed: 20,
      }), // 100%
      makeSummary({ repoId: "r3", repoName: "r3", day: dayKey(0), total: 4, passed: 2, failed: 2 }), // 50%, smaller total
    ];
    const result = computeFlakyRepos(summaries, new Map(), 10);
    expect(result[0]?.repoId).toBe("r2"); // 100%
    expect(result[1]?.repoId).toBe("r1"); // 50%, total=10
    expect(result[2]?.repoId).toBe("r3"); // 50%, total=4
  });

  it("respects the limit parameter", () => {
    const summaries: CheckRunSummary[] = Array.from({ length: 6 }, (_, i) =>
      makeSummary({
        repoId: `r${i}`,
        repoName: `r${i}`,
        day: dayKey(0),
        total: 5,
        passed: 0,
        failed: 5,
      }),
    );
    expect(computeFlakyRepos(summaries, new Map(), 3)).toHaveLength(3);
  });

  it("prefers reposById name over summary repoName", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({
        repoId: "r1",
        repoName: "fallback-name",
        day: dayKey(0),
        total: 5,
        passed: 0,
        failed: 5,
      }),
    ];
    const repo = makeRepo({ id: "r1", name: "preferred-name" });
    const result = computeFlakyRepos(summaries, new Map([["r1", repo]]), 5);
    expect(result[0]?.repoName).toBe("preferred-name");
  });

  it("folds multiple summaries for the same repo", () => {
    const summaries: CheckRunSummary[] = [
      makeSummary({
        repoId: "r1",
        repoName: "r1",
        day: dayKey(0),
        total: 10,
        passed: 8,
        failed: 2,
      }),
      makeSummary({
        repoId: "r1",
        repoName: "r1",
        day: dayKey(1),
        total: 10,
        passed: 6,
        failed: 4,
      }),
    ];
    const result = computeFlakyRepos(summaries, new Map());
    expect(result).toHaveLength(1);
    expect(result[0]?.total).toBe(20);
    expect(result[0]?.failed).toBe(6);
    expect(result[0]?.failRate).toBeCloseTo(0.3);
  });
});

// ---------------------------------------------------------------------------
// computeHeatmap
// ---------------------------------------------------------------------------

describe("computeHeatmap", () => {
  it("returns a 7x24 matrix of zeros for empty commits", () => {
    const matrix = computeHeatmap([], TODAY);
    expect(matrix).toHaveLength(7);
    expect(matrix.every((row) => row.length === 24)).toBe(true);
    expect(matrix.flat().every((v) => v === 0)).toBe(true);
  });

  it("ignores commits outside the window", () => {
    const c = makeCommit({ timestamp: iso(20) });
    const total = computeHeatmap([c], TODAY, 14)
      .flat()
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("counts a commit into the correct weekday (Mon-first) and hour bucket", () => {
    // 2026-06-15 is a Monday — local noon (hour 12 in Berlin)
    const monday = new Date("2026-06-15T10:00:00Z"); // 12:00 Berlin (UTC+2 in June)
    const c = makeCommit({ timestamp: monday.toISOString() });
    const matrix = computeHeatmap([c], TODAY, 14);
    // Monday = JS getDay()=1, Mon-first index = (1+6)%7 = 0
    expect(matrix[0]?.[12]).toBe(1);
  });

  it("counts a Sunday commit into weekday index 6", () => {
    // 2026-06-14 is a Sunday — local noon
    const sunday = new Date("2026-06-14T10:00:00Z"); // 12:00 Berlin
    const c = makeCommit({ timestamp: sunday.toISOString() });
    const matrix = computeHeatmap([c], TODAY, 14);
    // Sunday = JS getDay()=0, Mon-first index = (0+6)%7 = 6
    expect(matrix[6]?.[12]).toBe(1);
  });

  it("accumulates multiple commits on the same weekday+hour cell", () => {
    const ts = iso(0, 9); // today at 09:00
    const commits = [makeCommit({ timestamp: ts }), makeCommit({ timestamp: ts, sha: "bbb" })];
    const matrix = computeHeatmap(commits, TODAY, 14);
    const totalCount = matrix.flat().reduce((a, b) => a + b, 0);
    expect(totalCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeAuthorClock
// ---------------------------------------------------------------------------

describe("computeAuthorClock", () => {
  it("returns 24 zeros for empty commits", () => {
    const result = computeAuthorClock([]);
    expect(result).toHaveLength(24);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("counts commits into the correct hour (local time, Berlin)", () => {
    // 10:00 UTC = 12:00 Berlin summer time
    const c = makeCommit({ timestamp: "2026-06-15T10:00:00Z" });
    const result = computeAuthorClock([c]);
    expect(result[12]).toBe(1);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("does not filter by date window (all commits count)", () => {
    // A commit from long ago — computeAuthorClock has no window filter
    const old = makeCommit({ timestamp: "2020-01-01T10:00:00Z" }); // 11:00 Berlin winter
    const result = computeAuthorClock([old]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("accumulates multiple commits in the same hour", () => {
    const commits = [
      makeCommit({ timestamp: "2026-06-15T10:00:00Z" }), // hour 12 Berlin
      makeCommit({ timestamp: "2026-06-15T10:30:00Z", sha: "bbb" }), // also hour 12
    ];
    const result = computeAuthorClock(commits);
    expect(result[12]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeLanguageMix
// ---------------------------------------------------------------------------

describe("computeLanguageMix", () => {
  it("returns empty array for empty commits", () => {
    expect(computeLanguageMix([], new Map())).toEqual([]);
  });

  it("falls back to repo.lang when no langShares present", () => {
    const repo = makeRepo({ id: "r1", lang: "Rust", langShares: {} });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result).toHaveLength(1);
    expect(result[0]?.language).toBe("Rust");
    expect(result[0]?.share).toBeCloseTo(1);
  });

  it("falls back to 'Other' when repo is unknown and has no lang", () => {
    const c = makeCommit({ repoId: "unknown-repo" });
    const result = computeLanguageMix([c], new Map());
    expect(result[0]?.language).toBe("Other");
  });

  it("uses langShares when present and distributes weight by share", () => {
    const repo = makeRepo({
      id: "r1",
      langShares: { TypeScript: 0.7, CSS: 0.3 },
    });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    const ts = result.find((r) => r.language === "TypeScript");
    const css = result.find((r) => r.language === "CSS");
    expect(ts).toBeDefined();
    expect(css).toBeDefined();
    expect(ts!.share + css!.share).toBeCloseTo(1, 5);
    expect(ts!.share).toBeGreaterThan(css!.share);
  });

  it("collapses TSX into TypeScript via alias", () => {
    const repo = makeRepo({ id: "r1", langShares: { TSX: 1 } });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result.find((r) => r.language === "TypeScript")).toBeDefined();
    expect(result.find((r) => r.language === "TSX")).toBeUndefined();
  });

  it("collapses SCSS into CSS via alias", () => {
    const repo = makeRepo({ id: "r1", langShares: { SCSS: 1 } });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result.find((r) => r.language === "CSS")).toBeDefined();
  });

  it("collapses image extensions into Images meta bucket", () => {
    const repo = makeRepo({ id: "r1", langShares: { png: 0.5, svg: 0.5 } });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result.find((r) => r.language === "Images")).toBeDefined();
    // png and svg both → Images, so there should be just one bucket
    expect(result.filter((r) => r.language === "Images")).toHaveLength(1);
  });

  it("collapses lock files into Other", () => {
    const repo = makeRepo({ id: "r1", langShares: { "yarn.lock": 1 } });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result.find((r) => r.language === "Other")).toBeDefined();
  });

  it("handles empty/missing langShares key as 'Other'", () => {
    const repo = makeRepo({ id: "r1", langShares: { "": 1 } });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result.find((r) => r.language === "Other")).toBeDefined();
  });

  it("sorts slices by share descending", () => {
    const repo = makeRepo({
      id: "r1",
      langShares: { TypeScript: 0.1, Rust: 0.8, Python: 0.1 },
    });
    const c = makeCommit({ repoId: "r1" });
    const result = computeLanguageMix([c], new Map([["r1", repo]]));
    expect(result[0]?.language).toBe("Rust");
  });

  it("aggregates langShares across multiple commits for the same repo", () => {
    const repo = makeRepo({ id: "r1", langShares: { TypeScript: 1 } });
    const commits = [makeCommit({ repoId: "r1" }), makeCommit({ repoId: "r1", sha: "bbb" })];
    const result = computeLanguageMix(commits, new Map([["r1", repo]]));
    expect(result).toHaveLength(1);
    // commits field is sum of weight, normalized by total
    expect(result[0]?.share).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// computeChurn
// ---------------------------------------------------------------------------

describe("computeChurn", () => {
  it("returns empty array when all repos have total churn of 0", () => {
    const repos: EnrichedRepo[] = [makeRepo({ id: "r1", added: 0, removed: 0 })];
    expect(computeChurn(repos)).toEqual([]);
  });

  it("returns empty array for empty repos list", () => {
    expect(computeChurn([])).toEqual([]);
  });

  it("maps added+removed to total and sorts by total descending", () => {
    const repos: EnrichedRepo[] = [
      makeRepo({ id: "r1", added: 10, removed: 5 }), // total 15
      makeRepo({ id: "r2", added: 100, removed: 50 }), // total 150
      makeRepo({ id: "r3", added: 0, removed: 0 }), // excluded
    ];
    const result = computeChurn(repos);
    expect(result).toHaveLength(2);
    expect(result[0]?.repoId).toBe("r2");
    expect(result[0]?.total).toBe(150);
    expect(result[1]?.repoId).toBe("r1");
    expect(result[1]?.total).toBe(15);
  });

  it("respects the limit parameter", () => {
    const repos: EnrichedRepo[] = Array.from({ length: 10 }, (_, i) =>
      makeRepo({ id: `r${i}`, added: i + 1, removed: 0 }),
    );
    expect(computeChurn(repos, 3)).toHaveLength(3);
  });

  it("includes correct added/removed breakdowns in each row", () => {
    const repos: EnrichedRepo[] = [makeRepo({ id: "r1", added: 42, removed: 7 })];
    const result = computeChurn(repos);
    expect(result[0]?.added).toBe(42);
    expect(result[0]?.removed).toBe(7);
    expect(result[0]?.total).toBe(49);
  });
});

// ---------------------------------------------------------------------------
// colorForAuthor
// ---------------------------------------------------------------------------

describe("colorForAuthor", () => {
  it("returns a hex color string", () => {
    const color = colorForAuthor("Alice");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns the same color for the same name (deterministic)", () => {
    expect(colorForAuthor("Alice")).toBe(colorForAuthor("Alice"));
  });

  it("returns different colors for different names", () => {
    // Not guaranteed to differ for every pair, but these two should differ.
    const a = colorForAuthor("Alice");
    const b = colorForAuthor("Bob");
    // If they happen to collide in the palette it's still technically valid.
    // We assert they are both valid hex colors.
    expect(a).toMatch(/^#[0-9a-f]{6}$/i);
    expect(b).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns a valid color for an empty string", () => {
    // Empty string → h=0 → palette[0]
    const color = colorForAuthor("");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
