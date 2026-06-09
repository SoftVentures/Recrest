import type { ActivityRange, RecentCommit } from "@recrest/shared";

import { startOfLocalDay } from "@/lib/activityStats";

const DAY_MS = 86_400_000;

export type BucketUnit = "day" | "week" | "month";

/** Whole days the range spans (≥1). */
export function windowDaysOf(range: ActivityRange): number {
  return Math.max(1, Math.ceil((Date.parse(range.until) - Date.parse(range.since)) / DAY_MS));
}

/**
 * Adaptive bucket granularity so a sparkline/chart stays readable at any range:
 * daily up to a month, weekly up to ~half a year, monthly beyond. Mirrors the
 * agreed UX (7d/14d/30d → days, 90d → weeks, 1y/all → months).
 */
export function bucketUnitForWindow(windowDays: number): BucketUnit {
  if (windowDays <= 30) return "day";
  if (windowDays <= 180) return "week";
  return "month";
}

/** Approximate day-span of one bucket of the given unit. */
function bucketSizeDays(unit: BucketUnit): number {
  return unit === "day" ? 1 : unit === "week" ? 7 : 30;
}

export interface BucketedActivity {
  /** Counts oldest → newest; the last entry ends at `range.until` ("today"). */
  buckets: number[];
  unit: BucketUnit;
  windowDays: number;
}

/**
 * Bucket a commit stream into a fixed-width series ending at `range.until`.
 * Buckets are anchored to the range end (rightmost = most recent) so the chart
 * reads "oldest → today" left to right, matching the day-bars the dashboard
 * used before. Commits outside the window are ignored.
 */
export function bucketCommits(
  commits: readonly RecentCommit[],
  range: ActivityRange,
): BucketedActivity {
  const windowDays = windowDaysOf(range);
  const unit = bucketUnitForWindow(windowDays);
  const size = bucketSizeDays(unit);
  const count = Math.max(1, Math.ceil(windowDays / size));
  const buckets = new Array<number>(count).fill(0);
  const untilDayMs = startOfLocalDay(new Date(range.until)).getTime();

  for (const c of commits) {
    const idx = bucketIndex(c.timestamp, untilDayMs, windowDays, size, count);
    if (idx >= 0) buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return { buckets, unit, windowDays };
}

export interface BucketedByRepo {
  byRepo: Map<string, number[]>;
  unit: BucketUnit;
  windowDays: number;
}

/** Per-repo variant of {@link bucketCommits} — one fixed-width series per repo. */
export function bucketCommitsByRepo(
  commits: readonly RecentCommit[],
  range: ActivityRange,
): BucketedByRepo {
  const windowDays = windowDaysOf(range);
  const unit = bucketUnitForWindow(windowDays);
  const size = bucketSizeDays(unit);
  const count = Math.max(1, Math.ceil(windowDays / size));
  const untilDayMs = startOfLocalDay(new Date(range.until)).getTime();
  const byRepo = new Map<string, number[]>();

  for (const c of commits) {
    const idx = bucketIndex(c.timestamp, untilDayMs, windowDays, size, count);
    if (idx < 0) continue;
    let series = byRepo.get(c.repoId);
    if (!series) {
      series = new Array<number>(count).fill(0);
      byRepo.set(c.repoId, series);
    }
    series[idx] = (series[idx] ?? 0) + 1;
  }
  return { byRepo, unit, windowDays };
}

/** Map a timestamp to its bucket index (0 = oldest, count-1 = newest), or -1. */
function bucketIndex(
  isoTimestamp: string,
  untilDayMs: number,
  windowDays: number,
  size: number,
  count: number,
): number {
  const day = startOfLocalDay(new Date(isoTimestamp)).getTime();
  const daysAgo = Math.floor((untilDayMs - day) / DAY_MS);
  // Half-open window: buckets cover local days 0..windowDays-1. A commit exactly
  // `windowDays` local days old sits one day past the last bucket, so it can
  // appear in the range-filtered commit list (ms-based, includes the `since`
  // boundary) yet not in the bars — an intentional one-day edge, not a bug.
  if (daysAgo < 0 || daysAgo >= windowDays) return -1;
  const fromEnd = Math.floor(daysAgo / size);
  const idx = count - 1 - fromEnd;
  return idx >= 0 && idx < count ? idx : -1;
}
