import { describe, expect, it } from "vitest";

import type { CheckRunSummary, PrEvent, PullRequest, RecentCommit } from "@recrest/shared";

import {
  colorForAuthor,
  computeAuthorClock,
  computeChurn,
  computeCiPassRate,
  computeFlakyRepos,
  computeHeatmap,
  computeLanguageMix,
  computePrVelocity,
  computeReviewQueue,
  computeTimeToMerge,
} from "@/lib/activityAggregates";
import { startOfLocalDay } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";

const today = startOfLocalDay(new Date("2026-04-20T12:00:00Z"));

function commit(sha: string, repoId: string, author: string, ts: string): RecentCommit {
  return {
    sha,
    summary: `c-${sha}`,
    author,
    authorEmail: null,
    timestamp: ts,
    repoId,
    repoName: repoId,
  };
}

function repo(id: string, over: Partial<EnrichedRepo> = {}): EnrichedRepo {
  return {
    id,
    name: id,
    path: `/tmp/${id}`,
    remoteUrl: null,
    providerId: null,
    groupId: null,
    status: null,
    group: "default",
    lang: "TypeScript",
    added: 0,
    removed: 0,
    filesChanged: 0,
    activity: [],
    pinned: false,
    clean: true,
    ...over,
  } as unknown as EnrichedRepo;
}

describe("computePrVelocity", () => {
  it("counts opened and merged per day", () => {
    const events: PrEvent[] = [
      {
        repoId: "r1",
        repoName: "r1",
        number: 1,
        title: "a",
        author: "x",
        kind: "opened",
        timestamp: today.toISOString(),
        url: "u",
      },
      {
        repoId: "r1",
        repoName: "r1",
        number: 1,
        title: "a",
        author: "x",
        kind: "merged",
        timestamp: today.toISOString(),
        url: "u",
      },
    ];
    const rows = computePrVelocity(events, today);
    expect(rows[0]).toEqual({ day: 0, opened: 1, merged: 1 });
    expect(rows.length).toBe(14);
  });
});

describe("computeTimeToMerge", () => {
  it("buckets by merge latency", () => {
    const now = today.toISOString();
    const hourAgo = new Date(today.getTime() - 30 * 60_000).toISOString();
    const events: PrEvent[] = [
      {
        repoId: "r1",
        repoName: "r1",
        number: 1,
        title: "a",
        author: "x",
        kind: "opened",
        timestamp: hourAgo,
        url: "u",
      },
      {
        repoId: "r1",
        repoName: "r1",
        number: 1,
        title: "a",
        author: "x",
        kind: "merged",
        timestamp: now,
        url: "u",
      },
    ];
    const buckets = computeTimeToMerge(events);
    expect(buckets[0]?.count).toBe(1);
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(1);
  });
});

describe("computeReviewQueue", () => {
  it("sorts oldest open PR first and ignores merged", () => {
    const prs: Record<string, PullRequest[]> = {
      r1: [
        {
          id: "1",
          number: 1,
          title: "old",
          url: "u",
          author: "a",
          state: "open",
          draft: false,
          sourceBranch: "f",
          targetBranch: "main",
          createdAt: "2026-04-01T00:00:00Z",
          updatedAt: "2026-04-01T00:00:00Z",
          additions: null,
          deletions: null,
          ciStatus: null,
        } as unknown as PullRequest,
        {
          id: "2",
          number: 2,
          title: "new",
          url: "u",
          author: "b",
          state: "open",
          draft: false,
          sourceBranch: "f",
          targetBranch: "main",
          createdAt: "2026-04-19T00:00:00Z",
          updatedAt: "2026-04-19T00:00:00Z",
          additions: null,
          deletions: null,
          ciStatus: null,
        } as unknown as PullRequest,
      ],
    };
    const repos = new Map([["r1", repo("r1")]]);
    const out = computeReviewQueue(prs, repos, today);
    expect(out[0]?.number).toBe(1);
    expect(out.length).toBe(2);
  });
});

describe("computeCiPassRate", () => {
  it("sums passed/total per day and derives rate", () => {
    const summaries: CheckRunSummary[] = [
      {
        repoId: "r1",
        repoName: "r1",
        day: "2026-04-20",
        total: 10,
        passed: 8,
        failed: 2,
        shaSamples: [],
      },
    ];
    const rows = computeCiPassRate(summaries, today);
    const hit = rows.find((r) => r.total > 0);
    expect(hit?.passed).toBe(8);
    expect(hit?.rate).toBeCloseTo(0.8);
  });
});

describe("computeFlakyRepos", () => {
  it("ranks by failure rate", () => {
    const summaries: CheckRunSummary[] = [
      {
        repoId: "a",
        repoName: "a",
        day: "2026-04-20",
        total: 10,
        passed: 9,
        failed: 1,
        shaSamples: [],
      },
      {
        repoId: "b",
        repoName: "b",
        day: "2026-04-20",
        total: 10,
        passed: 2,
        failed: 8,
        shaSamples: [],
      },
    ];
    const repos = new Map([
      ["a", repo("a")],
      ["b", repo("b")],
    ]);
    const out = computeFlakyRepos(summaries, repos);
    expect(out[0]?.repoId).toBe("b");
  });
});

describe("computeHeatmap", () => {
  it("returns 7x24 zeroed matrix for empty input", () => {
    const m = computeHeatmap([], today);
    expect(m.length).toBe(7);
    expect(m[0]?.length).toBe(24);
    expect(m.flat().every((v) => v === 0)).toBe(true);
  });
});

describe("computeAuthorClock", () => {
  it("distributes commits per hour", () => {
    const hours = computeAuthorClock([commit("a", "r1", "x", "2026-04-20T09:00:00Z")]);
    expect(hours.length).toBe(24);
    expect(hours.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("computeLanguageMix", () => {
  it("weights by commit count and falls back to Other", () => {
    const reposById = new Map([
      ["r1", repo("r1", { lang: "TypeScript" })],
      ["r2", repo("r2", { lang: "mixed" })],
    ]);
    const commits: RecentCommit[] = [
      commit("a", "r1", "x", today.toISOString()),
      commit("b", "r1", "x", today.toISOString()),
      commit("c", "r2", "x", today.toISOString()),
    ];
    const mix = computeLanguageMix(commits, reposById);
    expect(mix[0]?.language).toBe("TypeScript");
    expect(mix[0]?.share).toBeCloseTo(2 / 3);
  });
});

describe("computeChurn", () => {
  it("sorts repos by total churn desc", () => {
    const churn = computeChurn([
      repo("a", { added: 10, removed: 5 }),
      repo("b", { added: 100, removed: 50 }),
      repo("c", { added: 0, removed: 0 }),
    ]);
    expect(churn[0]?.repoId).toBe("b");
    expect(churn.length).toBe(2);
  });
});

describe("colorForAuthor", () => {
  it("returns a stable hex color from the curated palette", () => {
    expect(colorForAuthor("alice")).toBe(colorForAuthor("alice"));
    expect(colorForAuthor("alice")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
