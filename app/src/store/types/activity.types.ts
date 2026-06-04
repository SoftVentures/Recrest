import type { ActivityRange, RecentCommit } from "@recrest/shared";

export interface RepoCommits {
  rangeLoaded: ActivityRange | null;
  commits: RecentCommit[];
  status: "idle" | "loading" | "error";
  truncated: boolean;
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
