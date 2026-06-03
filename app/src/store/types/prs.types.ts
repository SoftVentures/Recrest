import type {
  Comment,
  FileDiff,
  PrFilters,
  PullRequest,
  PullRequestDetail,
  RepositoryId,
} from "@recrest/shared";

export interface PrsState {
  items: Record<RepositoryId, PullRequest[]>;
  detail: Record<string, PullRequestDetail>;
  detailLoading: Record<string, boolean>;
  /** Per-PR parsed file diffs, keyed by `detailKey(repoId, prNumber)`. */
  diff: Record<string, FileDiff[]>;
  diffLoading: Record<string, boolean>;
  /** Locally-appended comments posted this session, keyed by detail key.
   *  The host's own feed already includes them on next fetch; this just gives
   *  instant feedback without a round-trip. */
  comments: Record<string, Comment[]>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: PrFilters;
}
