import type { RecentCommit } from "@recrest/shared";

import { signatureKey } from "@/lib/authorNormalize";
import {
  CHART_PALETTE,
  buildRepoColorMap as buildRepoColorMapImpl,
  colorForRepo as colorForRepoImpl,
} from "@/lib/charts/palette";

export const ACTIVITY_DAYS = 14;
const WEEK = 7;

/** Millisecond epoch at start of local day. */
function msStartOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfLocalDay(date: Date): Date {
  return new Date(msStartOfLocalDay(date));
}

/** Days ago (0..ACTIVITY_DAYS-1), or -1 outside the window. */
export function daysAgo(isoTimestamp: string, today: Date): number {
  const commitDay = msStartOfLocalDay(new Date(isoTimestamp));
  const days = Math.floor((today.getTime() - commitDay) / 86_400_000);
  if (days < 0 || days >= ACTIVITY_DAYS) return -1;
  return days;
}

export function relativeWhen(isoTimestamp: string, day: number): string {
  if (day === 0) {
    const h = Math.max(1, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000));
    return `${h}h ago`;
  }
  return `${day}d ago`;
}

export function dayLabel(d: number): string {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

/**
 * @deprecated Import `CHART_PALETTE` from `@/lib/charts/palette` instead.
 * Re-exported here under the legacy name so existing callers keep working.
 */
export const ACTIVITY_PALETTE = CHART_PALETTE;

export const colorForRepo = colorForRepoImpl;
export const buildRepoColorMap = buildRepoColorMapImpl;

/** Consecutive-days-with-≥1-commit streak ending at `today`. */
export function currentStreak(commits: readonly RecentCommit[], today: Date): number {
  const days = new Set<number>();
  for (const c of commits) {
    const d = daysAgo(c.timestamp, today);
    if (d >= 0) days.add(d);
  }
  let n = 0;
  while (days.has(n) && n < ACTIVITY_DAYS) n += 1;
  return n;
}

/** Longest streak anywhere in the 14-day window. */
export function longestStreak(commits: readonly RecentCommit[], today: Date): number {
  const days = new Set<number>();
  for (const c of commits) {
    const d = daysAgo(c.timestamp, today);
    if (d >= 0) days.add(d);
  }
  let best = 0;
  let cur = 0;
  for (let i = 0; i < ACTIVITY_DAYS; i++) {
    if (days.has(i)) {
      cur += 1;
      if (cur > best) best = cur;
    } else cur = 0;
  }
  return best;
}

/** Short weekday label (EN, "Mon"…"Sun") for a days-ago offset. */
export function weekdayLabel(daysAgoValue: number, today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgoValue);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Pair of totals for this week (days 0..6) vs previous week (days 7..13). */
export interface WeekPair {
  current: number;
  previous: number;
  delta: number;
}

function weekPair(byDay: number[]): WeekPair {
  const current = byDay.slice(0, WEEK).reduce((a, b) => a + b, 0);
  const previous = byDay.slice(WEEK, WEEK * 2).reduce((a, b) => a + b, 0);
  return { current, previous, delta: current - previous };
}

export interface ActivityStats {
  commits: WeekPair;
  authors: WeekPair;
  repos: WeekPair;
  currentStreak: number;
  longestStreak: number;
  busiestDay: { label: string; count: number } | null;
  peakHour: { label: string; count: number } | null;
  quietestRepos: string[];
}

/** Computes all rollups from the filtered commit stream. */
export function computeActivityStats(
  commits: readonly RecentCommit[],
  today: Date,
  allRepoIds: readonly string[],
): ActivityStats {
  const commitsByDay = Array.from({ length: ACTIVITY_DAYS }, () => 0);
  const authorsByDay: Array<Set<string>> = Array.from({ length: ACTIVITY_DAYS }, () => new Set());
  const reposByDay: Array<Set<string>> = Array.from({ length: ACTIVITY_DAYS }, () => new Set());
  const byWeekday = new Map<number, number>();
  const byHour = Array.from({ length: 24 }, () => 0);
  const seenRepos = new Set<string>();

  for (const c of commits) {
    const d = daysAgo(c.timestamp, today);
    if (d < 0) continue;
    commitsByDay[d] = (commitsByDay[d] ?? 0) + 1;
    authorsByDay[d]?.add(c.author);
    reposByDay[d]?.add(c.repoId);
    seenRepos.add(c.repoId);

    const dt = new Date(c.timestamp);
    const wd = dt.getDay();
    byWeekday.set(wd, (byWeekday.get(wd) ?? 0) + 1);
    byHour[dt.getHours()] = (byHour[dt.getHours()] ?? 0) + 1;
  }

  const commitsPair = weekPair(commitsByDay);

  const authorsThis = new Set<string>();
  const authorsLast = new Set<string>();
  const reposThis = new Set<string>();
  const reposLast = new Set<string>();
  for (let i = 0; i < ACTIVITY_DAYS; i++) {
    const bucketA = i < WEEK ? authorsThis : authorsLast;
    const bucketR = i < WEEK ? reposThis : reposLast;
    for (const a of authorsByDay[i] ?? []) bucketA.add(a);
    for (const r of reposByDay[i] ?? []) bucketR.add(r);
  }

  const busiestWdEntry = [...byWeekday.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const busiestDay = busiestWdEntry
    ? {
        label: new Date(
          2024,
          0,
          busiestWdEntry[0] === 0 ? 7 : busiestWdEntry[0],
        ).toLocaleDateString(undefined, { weekday: "short" }),
        count: busiestWdEntry[1],
      }
    : null;

  const peakHourIdx = byHour.reduce((best, v, i) => (v > (byHour[best] ?? -1) ? i : best), 0);
  const peakHour =
    (byHour[peakHourIdx] ?? 0) > 0
      ? {
          label: `${String(peakHourIdx).padStart(2, "0")}:00–${String((peakHourIdx + 2) % 24).padStart(2, "0")}:00`,
          count: byHour[peakHourIdx] ?? 0,
        }
      : null;

  const quietestRepos = allRepoIds.filter((id) => !seenRepos.has(id));

  return {
    commits: commitsPair,
    authors: {
      current: authorsThis.size,
      previous: authorsLast.size,
      delta: authorsThis.size - authorsLast.size,
    },
    repos: {
      current: reposThis.size,
      previous: reposLast.size,
      delta: reposThis.size - reposLast.size,
    },
    currentStreak: currentStreak(commits, today),
    longestStreak: longestStreak(commits, today),
    busiestDay,
    peakHour,
    quietestRepos,
  };
}

export interface AuthorBucket {
  author: string;
  /** First commit email we saw for this author — drives the Gravatar avatar
   *  in leaderboard rows. Null when no commit in range carried an email. */
  email: string | null;
  count: number;
  share: number;
  sparkline: number[];
}

/** Top-N authors by commit count, with a per-author 14-day sparkline.
 *
 * Plan 1 §A.4: aggregation key is `signatureKey(name, email)` so Unicode
 * variants of the same person collapse into one bucket
 * (`Müller` ↔ `Mueller`). The displayed `author` is the most-frequent name
 * variant we saw for that key — picking the first arbitrarily would let
 * Unicode/ASCII swap depending on commit ordering. `authorAliases` from
 * settings allows the user to manually merge two distinct keys (e.g.
 * work + private email of the same person).
 */
export function computeLeaderboard(
  commits: readonly RecentCommit[],
  today: Date,
  limit = 5,
  authorAliases: Readonly<Record<string, string>> = {},
): AuthorBucket[] {
  const byKey = new Map<
    string,
    { email: string | null; count: number; spark: number[]; nameCounts: Map<string, number> }
  >();
  const resolveKey = (raw: string): string => authorAliases[raw] ?? raw;

  for (const c of commits) {
    const d = daysAgo(c.timestamp, today);
    if (d < 0) continue;
    // Prefer the backend-computed `signatureKey` (canonical source); fall
    // back to recomputing in JS for legacy fixtures or pre-A.4 caches that
    // don't carry the field.
    const rawKey = c.signatureKey ?? signatureKey(c.author, c.authorEmail ?? null);
    const key = resolveKey(rawKey);
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = {
        email: null,
        count: 0,
        spark: Array.from({ length: ACTIVITY_DAYS }, () => 0),
        nameCounts: new Map(),
      };
      byKey.set(key, bucket);
    }
    if (!bucket.email && c.authorEmail) bucket.email = c.authorEmail;
    bucket.count += 1;
    bucket.spark[d] = (bucket.spark[d] ?? 0) + 1;
    bucket.nameCounts.set(c.author, (bucket.nameCounts.get(c.author) ?? 0) + 1);
  }
  const total = [...byKey.values()].reduce((a, b) => a + b.count, 0) || 1;
  return [...byKey.values()]
    .map((v) => {
      // Pick the most common display name for this signature; ties broken
      // by the first one seen (Map preserves insertion order).
      let bestName = "";
      let bestCount = -1;
      for (const [name, count] of v.nameCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestName = name;
        }
      }
      return {
        author: bestName,
        email: v.email,
        count: v.count,
        share: v.count / total,
        sparkline: v.spark,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Per-day stacked breakdown for the chart: ordered repo segments + totals. */
export interface StackedDay {
  day: number;
  total: number;
  segments: Array<{ repoId: string; repoName: string; count: number; color: string }>;
}

export function computeStackedChart(commits: readonly RecentCommit[], today: Date): StackedDay[] {
  const days: StackedDay[] = Array.from({ length: ACTIVITY_DAYS }, (_, i) => ({
    day: i,
    total: 0,
    segments: [],
  }));
  const perDayRepo = new Map<number, Map<string, { name: string; count: number }>>();
  for (const c of commits) {
    const d = daysAgo(c.timestamp, today);
    if (d < 0) continue;
    let m = perDayRepo.get(d);
    if (!m) {
      m = new Map();
      perDayRepo.set(d, m);
    }
    const entry = m.get(c.repoId);
    if (entry) entry.count += 1;
    else m.set(c.repoId, { name: c.repoName, count: 1 });
  }
  // Collision-free color map across the whole chart, not per-day: a repo
  // should read as the same color no matter which day its segment appears.
  const colorMap = buildRepoColorMap(commits.map((c) => c.repoId));
  for (const [day, m] of perDayRepo) {
    const target = days[day];
    if (!target) continue;
    const segs = [...m.entries()]
      .map(([repoId, v]) => ({
        repoId,
        repoName: v.name,
        count: v.count,
        color: colorMap.get(repoId) ?? colorForRepo(repoId),
      }))
      .sort((a, b) => b.count - a.count);
    target.segments = segs;
    target.total = segs.reduce((a, b) => a + b.count, 0);
  }
  return days;
}
