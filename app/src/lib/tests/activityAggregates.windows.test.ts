import type { CheckRunSummary, PrEvent, RecentCommit } from "@recrest/shared";
import { PrEventKind } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { computeCiPassRate, computeHeatmap, computePrVelocity } from "@/lib/activityAggregates";
import { ACTIVITY_DAYS } from "@/lib/activityStats";

const TODAY = new Date("2026-06-01T00:00:00");

/** Local-time ISO timestamp `n` days before TODAY at noon. */
function isoDaysAgo(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
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

function commit(partial: Partial<RecentCommit> & { timestamp: string }): RecentCommit {
  return {
    sha: partial.sha ?? `sha-${Math.random().toString(36).slice(2, 10)}`,
    summary: partial.summary ?? "test commit",
    author: partial.author ?? "A",
    authorEmail: partial.authorEmail ?? null,
    timestamp: partial.timestamp,
    repoId: partial.repoId ?? "repo-1",
    repoName: partial.repoName ?? "repo-1",
  };
}

function prEvent(partial: Partial<PrEvent> & { timestamp: string }): PrEvent {
  return {
    repoId: partial.repoId ?? "repo-1",
    repoName: partial.repoName ?? "repo-1",
    number: partial.number ?? 1,
    title: partial.title ?? "test pr",
    author: partial.author ?? "A",
    kind: partial.kind ?? PrEventKind.OPENED,
    timestamp: partial.timestamp,
    url: partial.url ?? "https://example.com/pr/1",
  };
}

function summary(partial: Partial<CheckRunSummary> & { day: string }): CheckRunSummary {
  return {
    repoId: partial.repoId ?? "repo-1",
    repoName: partial.repoName ?? "repo-1",
    day: partial.day,
    total: partial.total ?? 0,
    passed: partial.passed ?? 0,
    failed: partial.failed ?? 0,
    shaSamples: partial.shaSamples ?? [],
  };
}

describe("computePrVelocity windowDays", () => {
  it("returns windowDays rows", () => {
    expect(computePrVelocity([], TODAY, 7)).toHaveLength(7);
    expect(computePrVelocity([], TODAY)).toHaveLength(ACTIVITY_DAYS);
  });

  it("counts events beyond the default window only when widened", () => {
    const e = prEvent({ kind: PrEventKind.OPENED, timestamp: isoDaysAgo(20) });
    const wide = computePrVelocity([e], TODAY, 30);
    expect(wide[20]?.opened).toBe(1);
    const narrow = computePrVelocity([e], TODAY);
    expect(narrow.reduce((sum, r) => sum + r.opened, 0)).toBe(0);
  });
});

describe("computeCiPassRate windowDays", () => {
  it("returns windowDays rows", () => {
    expect(computeCiPassRate([], TODAY, 7)).toHaveLength(7);
    expect(computeCiPassRate([], TODAY)).toHaveLength(ACTIVITY_DAYS);
  });

  it("buckets summaries beyond the default window only when widened", () => {
    const s = summary({ day: dayKey(20), total: 4, passed: 2, failed: 2 });
    const wide = computeCiPassRate([s], TODAY, 30);
    expect(wide[20]?.total).toBe(4);
    expect(wide[20]?.rate).toBe(0.5);
    const narrow = computeCiPassRate([s], TODAY);
    expect(narrow.reduce((sum, r) => sum + r.total, 0)).toBe(0);
  });
});

describe("computeHeatmap windowDays", () => {
  it("keeps the 7x24 shape regardless of window", () => {
    const matrix = computeHeatmap([], TODAY, 30);
    expect(matrix).toHaveLength(7);
    expect(matrix[0]).toHaveLength(24);
  });

  it("counts commits beyond the default window only when widened", () => {
    const c = commit({ timestamp: isoDaysAgo(20) });
    const wideTotal = computeHeatmap([c], TODAY, 30)
      .flat()
      .reduce((a, b) => a + b, 0);
    expect(wideTotal).toBe(1);
    const narrowTotal = computeHeatmap([c], TODAY)
      .flat()
      .reduce((a, b) => a + b, 0);
    expect(narrowTotal).toBe(0);
  });
});
