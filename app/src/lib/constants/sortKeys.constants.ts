import { REPO_ACTIVE_SORT_KEYS, REPO_SORT_KEYS, type RepoSortKey } from "@recrest/shared";

export { REPO_ACTIVE_SORT_KEYS, REPO_SORT_KEYS, type RepoSortKey };

export interface RepoSortOptionUi {
  /** i18n key for the option label (namespace `repos`). */
  labelKey: `repos.sort.${string}`;
}

/** i18n key per sort mode, in display order. Component layer feeds this
 *  through `t()` to render the radio list. */
export const REPO_SORT_UI = {
  default: { labelKey: "repos.sort.default" },
  "name:asc": { labelKey: "repos.sort.nameAsc" },
  "name:desc": { labelKey: "repos.sort.nameDesc" },
  "lastModified:desc": { labelKey: "repos.sort.lastModified" },
  "status:asc": { labelKey: "repos.sort.status" },
} as const satisfies Record<RepoSortKey, RepoSortOptionUi>;
