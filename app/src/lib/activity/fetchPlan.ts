import type { ActivityRange } from "@recrest/shared";

import { missingSubranges } from "@/lib/activity/rangeMerge";

interface LoadedRepo {
  rangeLoaded: ActivityRange | null;
}

/**
 * Decide the `[since, until]` window `list_commits` should walk, or `null` when
 * every known repo already fully covers `range`.
 *
 * `knownRepoIds` is the full repo universe (`repos.items`), not just the repos
 * that already have commits. A freshly-scanned repo has no `commitsByRepo`
 * entry yet, so without consulting the universe a gap-only check would return
 * `null` (existing repos cover the range) and the new repo would never be
 * walked until a manual refresh. When any known repo isn't fully covered we
 * re-walk the whole `range`; the reducer's sha index dedupes the overlap.
 */
export function planFetchWindow(
  knownRepoIds: readonly string[],
  commitsByRepo: Record<string, LoadedRepo>,
  range: ActivityRange,
): ActivityRange | null {
  // "Unloaded" = no entry yet or an explicitly null loaded range (freshly
  // scanned or pruned). A *partially* loaded repo keeps a non-null range and is
  // handled by the gap math below — only a null one needs the whole window.
  const hasUnloadedRepo = knownRepoIds.some(
    (id) => (commitsByRepo[id]?.rangeLoaded ?? null) === null,
  );

  // Repos are fetched together, so their loaded ranges stay in lockstep — the
  // widest already-loaded range is a valid merge anchor for the gap math.
  const anyLoaded = Object.values(commitsByRepo).find((r) => r.rangeLoaded)?.rangeLoaded ?? null;
  const gaps = missingSubranges(anyLoaded, range);

  if (gaps.length === 0 && !hasUnloadedRepo) return null;
  if (hasUnloadedRepo) return { since: range.since, until: range.until };

  const since = gaps.reduce((a, g) => (g.since < a ? g.since : a), gaps[0]!.since);
  const until = gaps.reduce((a, g) => (g.until > a ? g.until : a), gaps[0]!.until);
  return { since, until };
}
