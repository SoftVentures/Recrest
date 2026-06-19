import type { BranchInfo } from "@recrest/shared";

/**
 * Cached `git_list_branches` results, keyed by repo id, so the Branches tab
 * renders instantly on re-entry (stale-while-revalidate) instead of re-fetching
 * every branch for every repo on each mount.
 */
export interface BranchesState {
  byRepoId: Record<string, BranchInfo[]>;
  /** Repo ids with an in-flight load. Tracked per repo so the tab loads
   *  progressively — each group renders the instant its own repo resolves,
   *  instead of waiting for the slowest one. The skeleton shows only while this
   *  is non-empty AND nothing is cached yet for the visible repos. */
  loadingRepoIds: string[];
}
