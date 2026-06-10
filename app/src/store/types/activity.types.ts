import type { ActivityRange, RecentCommit } from "@recrest/shared";

export interface RepoCommits {
  rangeLoaded: ActivityRange | null;
  commits: RecentCommit[];
  status: "idle" | "loading" | "error";
  truncated: boolean;
  /** SHA membership index kept in lockstep with `commits` so chunk dedup is
   *  O(chunk) instead of rebuilding a Set over the whole list every chunk
   *  (the streaming hot path). Reset whenever `commits` is cleared. */
  seen: Record<string, true>;
}

export interface ActivityState {
  commitsByRepo: Record<string, RepoCommits>;
  /** Single source of truth for the picker; mirrored to the URL by the page. */
  selectedRange: ActivityRange;
  /** Oldest commit across all repos — bound of the `all` preset. */
  oldestCommitDate: string | null;
  /** Id of the in-flight `list_commits` request; stale chunks are dropped. */
  activeRequestId: string | null;
}
