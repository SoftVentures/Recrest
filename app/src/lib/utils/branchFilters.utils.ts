import type { BranchInfo } from "@recrest/shared";

import { LocationFlag, TrackingFlag } from "@/lib/constants/branchesFilter.constants";

/** Returns true when the branch matches the user's tracking-state filter (or no filter is set). */
export function matchTrackingFilter(branch: BranchInfo, tracking: TrackingFlag | null): boolean {
  if (tracking === null) return true;
  if (tracking === TrackingFlag.AHEAD) return branch.ahead > 0;
  if (tracking === TrackingFlag.BEHIND) return branch.behind > 0;
  if (tracking === TrackingFlag.CLEAN) return branch.clean;
  return true;
}

/** Returns true when the branch matches the local/remote filter (or no filter is set). */
export function matchLocationFilter(branch: BranchInfo, location: LocationFlag | null): boolean {
  if (location === null) return true;
  if (location === LocationFlag.LOCAL) return !branch.isRemote;
  if (location === LocationFlag.REMOTE) return branch.isRemote;
  return true;
}

/**
 * Substring match against the branch's display label. Remote branches include
 * the remote name (`origin/feature/x`) so users can filter by remote prefix.
 *
 * `query` is expected pre-normalized (trimmed + lowercased) by the caller.
 */
export function matchSearchFilter(branch: BranchInfo, query: string): boolean {
  if (!query) return true;
  const label = branch.isRemote ? `${branch.remote ?? ""}/${branch.name}` : branch.name;
  return label.toLowerCase().includes(query);
}
