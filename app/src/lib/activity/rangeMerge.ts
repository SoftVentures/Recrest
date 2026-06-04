import type { ActivityRange } from "@recrest/shared";

/** ISO strings compare lexicographically, so no Date parsing needed here. */
export const rangesOverlap = (a: ActivityRange, b: ActivityRange) =>
  a.since <= b.until && b.since <= a.until;

/**
 * Which parts of `requested` are not covered by `loaded` and must be fetched?
 * Invariant: each repo keeps at most ONE contiguous loaded range. For a
 * disjoint request the whole requested range is fetched and the old data is
 * replaced (see `mergeRange`).
 */
export function missingSubranges(
  loaded: ActivityRange | null,
  requested: ActivityRange,
): ActivityRange[] {
  if (!loaded || !rangesOverlap(loaded, requested)) return [requested];
  const gaps: ActivityRange[] = [];
  if (requested.since < loaded.since) gaps.push({ since: requested.since, until: loaded.since });
  if (requested.until > loaded.until) gaps.push({ since: loaded.until, until: requested.until });
  return gaps;
}

/** New `rangeLoaded` after fetching `requested`: union on overlap, replace on disjoint. */
export function mergeRange(loaded: ActivityRange | null, requested: ActivityRange): ActivityRange {
  if (!loaded || !rangesOverlap(loaded, requested)) return requested;
  return {
    since: loaded.since < requested.since ? loaded.since : requested.since,
    until: loaded.until > requested.until ? loaded.until : requested.until,
  };
}
