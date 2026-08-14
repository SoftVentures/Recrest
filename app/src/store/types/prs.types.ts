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
  /** Repos with a `fetchPullRequests` in flight. The fetch fans out per repo,
   *  so this is the only honest granularity — a single global flag makes the
   *  whole view look busy while one repo is still resolving. */
  loadingRepoIds: RepositoryId[];
  /** Last fetch error per repo, so one provider outage can't blank the page
   *  for repos that loaded fine. */
  errorByRepo: Record<RepositoryId, string>;
  /** Derived from `loadingRepoIds` — "any repo is fetching". Kept on state so
   *  the global chrome reads it directly: `Header` and the Activity page both
   *  select `s.prs.loading` for their refresh indicator. */
  loading: boolean;
  /** Derived from `errorByRepo` — the **most recent** repo error, or `null`.
   *  Unlike `loading` no component selects this today; `errorByRepo` is the
   *  granularity the PR views need, and an app-wide "some provider failed"
   *  banner would blame the wrong repo. Kept as the slice's single-error
   *  aggregate so a future global surface has one honest value to read. */
  error: string | null;
  lastFetched: number | null;
  filters: PrFilters;
}
