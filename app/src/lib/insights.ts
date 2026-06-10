import type { RecentCommit } from "@recrest/shared";

/**
 * Insight aggregations over the full loaded commit range (Plan 04/01 §C.3).
 *
 * Timezone convention: all day-buckets use the USER'S LOCAL timezone, not
 * UTC — "streak = I commit every day" matches the user's life rhythm, not
 * the UTC clock. Keys are `YYYY-MM-DD` via `toLocaleDateString("en-CA")`.
 */

const DAY_MS = 86_400_000;

function localDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function localDayKeyOf(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

/** Parses a `YYYY-MM-DD` key back to a local-midnight Date. */
function fromDayKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

function sortedUniqueDayKeys(commits: readonly RecentCommit[]): string[] {
  return Array.from(new Set(commits.map((c) => localDayKey(c.timestamp)))).sort();
}

export interface Streaks {
  current: number;
  longest: number;
  longestRange: { start: string; end: string } | null;
}

/** Consecutive local days with >=1 commit. `current` runs up to `today`
 *  (a commit today or yesterday keeps it alive — today may not be over). */
export function computeStreaks(commits: readonly RecentCommit[], today: Date): Streaks {
  const keys = sortedUniqueDayKeys(commits);
  if (keys.length === 0) return { current: 0, longest: 0, longestRange: null };
  const keySet = new Set(keys);

  let longest = 0;
  let longestRange: Streaks["longestRange"] = null;
  let runStart = 0;
  for (let i = 0; i < keys.length; i++) {
    const prev = i > 0 ? fromDayKey(keys[i - 1]!).getTime() : null;
    const cur = fromDayKey(keys[i]!).getTime();
    if (prev === null || Math.round((cur - prev) / DAY_MS) !== 1) runStart = i;
    const len = i - runStart + 1;
    if (len > longest) {
      longest = len;
      longestRange = { start: keys[runStart]!, end: keys[i]! };
    }
  }

  let current = 0;
  const cursor = new Date(today);
  if (!keySet.has(localDayKeyOf(cursor))) cursor.setDate(cursor.getDate() - 1); // today not over yet
  while (keySet.has(localDayKeyOf(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest, longestRange };
}

export interface Trend {
  direction: "up" | "down" | "flat";
  deltaPct: number;
}

/** `(today - periodDays, today]` vs `(today - 2*periodDays, today - periodDays]`
 *  by local-day keys. `flat` below a 5% absolute delta. */
export function computeTrend(
  commits: readonly RecentCommit[],
  periodDays: number,
  today: Date,
): Trend {
  const todayKey = localDayKeyOf(today);
  const edge = new Date(today);
  edge.setDate(edge.getDate() - periodDays);
  const edgeKey = localDayKeyOf(edge);
  const prevEdge = new Date(today);
  prevEdge.setDate(prevEdge.getDate() - 2 * periodDays);
  const prevEdgeKey = localDayKeyOf(prevEdge);

  let cur = 0;
  let prev = 0;
  for (const commit of commits) {
    const k = localDayKey(commit.timestamp);
    if (k > edgeKey && k <= todayKey) cur += 1;
    else if (k > prevEdgeKey && k <= edgeKey) prev += 1;
  }
  const deltaPct = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
  const direction = Math.abs(deltaPct) < 5 ? "flat" : deltaPct > 0 ? "up" : "down";
  return { direction, deltaPct };
}

export interface TopAuthor {
  author: string;
  email: string | null;
  count: number;
}

export function computeTopAuthorsByPeriod(
  commits: readonly RecentCommit[],
  periodDays: number,
  limit: number,
  today: Date,
): TopAuthor[] {
  const edge = new Date(today);
  edge.setDate(edge.getDate() - periodDays);
  const edgeKey = localDayKeyOf(edge);
  const byAuthor = new Map<string, TopAuthor>();
  for (const commit of commits) {
    if (localDayKey(commit.timestamp) <= edgeKey) continue;
    const entry = byAuthor.get(commit.author) ?? {
      author: commit.author,
      email: commit.authorEmail,
      count: 0,
    };
    entry.count += 1;
    byAuthor.set(commit.author, entry);
  }
  return Array.from(byAuthor.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Local weekday (JS `getDay()`: 0=Sun..6=Sat) with the highest commit count. */
export function computeMostActiveDayOfWeek(
  commits: readonly RecentCommit[],
): { day: number; count: number } | null {
  if (commits.length === 0) return null;
  const counts = Array.from({ length: 7 }, () => 0);
  for (const commit of commits) {
    const day = new Date(commit.timestamp).getDay();
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const max = Math.max(...counts);
  return { day: counts.indexOf(max), count: max };
}

/** Commits per week averaged over the local-day span first→last commit. */
export function computeAvgCommitsPerWeek(commits: readonly RecentCommit[]): number {
  if (commits.length === 0) return 0;
  const keys = sortedUniqueDayKeys(commits);
  const spanDays =
    Math.round(
      (fromDayKey(keys[keys.length - 1]!).getTime() - fromDayKey(keys[0]!).getTime()) / DAY_MS,
    ) + 1;
  const weeks = Math.max(1, spanDays / 7);
  return commits.length / weeks;
}

export interface LongestGap {
  startDate: string;
  endDate: string;
  days: number;
}

/** Longest run of local days WITHOUT a commit between first and last commit;
 *  `days` counts both boundary gap days inclusively. */
export function computeLongestGap(commits: readonly RecentCommit[]): LongestGap | null {
  const keys = sortedUniqueDayKeys(commits);
  if (keys.length < 2) return null;
  let best: LongestGap | null = null;
  for (let i = 1; i < keys.length; i++) {
    const prev = fromDayKey(keys[i - 1]!);
    const cur = fromDayKey(keys[i]!);
    const gapDays = Math.round((cur.getTime() - prev.getTime()) / DAY_MS) - 1;
    if (gapDays <= 0) continue;
    const start = new Date(prev);
    start.setDate(start.getDate() + 1);
    const end = new Date(cur);
    end.setDate(end.getDate() - 1);
    if (!best || gapDays > best.days) {
      best = { startDate: localDayKeyOf(start), endDate: localDayKeyOf(end), days: gapDays };
    }
  }
  return best;
}
