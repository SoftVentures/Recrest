import type { RepoListSort, RepoListViewMode, RepoSortKey } from "@recrest/shared";

import type { EnrichedRepo } from "@/lib/repoEnrich";

/** Page-local list view. `grouped`/`flat` both render the list; the backend
 *  splits them so the grouped-vs-flat choice survives a restart. */
export type RepoView = "list" | "card";

/** Map a page `RepoSortKey` to the persisted `{ field, direction }` shape.
 *  `default` (grouped, no explicit sort) maps to an empty field. */
export function sortKeyToBackend(key: RepoSortKey): RepoListSort {
  switch (key) {
    case "name:asc":
      return { field: "name", direction: "asc" };
    case "name:desc":
      return { field: "name", direction: "desc" };
    case "lastModified:desc":
      return { field: "lastModified", direction: "desc" };
    case "status:asc":
      return { field: "status", direction: "asc" };
    case "default":
    default:
      return { field: "", direction: "asc" };
  }
}

export function sortKeyFromBackend(sort: RepoListSort): RepoSortKey {
  if (sort.field === "name") return sort.direction === "desc" ? "name:desc" : "name:asc";
  if (sort.field === "lastModified") return "lastModified:desc";
  if (sort.field === "status") return "status:asc";
  return "default";
}

export function viewToBackend(view: RepoView, sort: RepoSortKey): RepoListViewMode {
  if (view === "card") return "card";
  return sort === "default" ? "grouped" : "flat";
}

export function viewFromBackend(mode: RepoListViewMode): RepoView {
  return mode === "card" ? "card" : "list";
}

/**
 * Numeric rank for sorting repos by their working-tree state.
 * Lower wins (conflicts surface first, clean repos sink to the bottom).
 */
export function statusRank(repo: EnrichedRepo): number {
  if (repo.status.conflicted > 0) return 0;
  if (repo.status.dirty) return 1;
  if (repo.status.behind > 0) return 2;
  if (repo.status.ahead > 0) return 3;
  return 4;
}

/** Epoch ms of the repo's last commit, or 0 when no timestamp is available. */
export function lastCommitTime(repo: EnrichedRepo): number {
  const ts = repo.status.lastCommit?.timestamp;
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}
