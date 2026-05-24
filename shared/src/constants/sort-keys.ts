/** Sort modes available on the Repos list. `default` means
 *  "group-by + provider order" — the no-sort baseline rendered as
 *  collapsible group headers. The other entries apply a flat sort and hide
 *  the group headers. */
export const REPO_SORT_KEYS = [
  "default",
  "name:asc",
  "name:desc",
  "lastModified:desc",
  "status:asc",
] as const;

export type RepoSortKey = (typeof REPO_SORT_KEYS)[number];

/** The non-default sort keys — used to detect whether any sort filter is
 *  active (drives the "active filter" badge on the toolbar). */
export const REPO_ACTIVE_SORT_KEYS = REPO_SORT_KEYS.filter((k) => k !== "default");
