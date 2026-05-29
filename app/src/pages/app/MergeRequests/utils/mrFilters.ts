import type { CiStatus, PullRequest } from "@recrest/shared";

export interface MrFiltersState {
  repoIds: Set<string>;
  authors: Set<string>;
  ciStatuses: Set<CiStatus>;
  includeDrafts: boolean;
}

export const EMPTY_MR_FILTERS: MrFiltersState = {
  repoIds: new Set(),
  authors: new Set(),
  ciStatuses: new Set(),
  includeDrafts: true,
};

export function cloneMrFilters(f: MrFiltersState): MrFiltersState {
  return {
    repoIds: new Set(f.repoIds),
    authors: new Set(f.authors),
    ciStatuses: new Set(f.ciStatuses),
    includeDrafts: f.includeDrafts,
  };
}

// An empty selection set means "no filter on this dimension" — the inverse
// (empty = hide everything) would force the user to manually re-select all
// repos on every page load. This matches the GitHub/Linear filter pattern.
export function applyMrFilters<T extends { pr: PullRequest; repoId: string }>(
  rows: T[],
  f: MrFiltersState,
): T[] {
  return rows.filter((r) => {
    if (f.repoIds.size > 0 && !f.repoIds.has(r.repoId)) return false;
    if (f.authors.size > 0 && !f.authors.has(r.pr.author)) return false;
    if (!f.includeDrafts && r.pr.draft) return false;
    if (f.ciStatuses.size > 0) {
      const ci = (r.pr.ciStatus ?? "none") as CiStatus;
      if (!f.ciStatuses.has(ci)) return false;
    }
    return true;
  });
}

export function activeMrFilterCount(f: MrFiltersState): number {
  let n = 0;
  if (f.repoIds.size > 0) n++;
  if (f.authors.size > 0) n++;
  if (f.ciStatuses.size > 0) n++;
  if (!f.includeDrafts) n++;
  return n;
}

export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
