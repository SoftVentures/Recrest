/** Status filter chips on the Repos toolbar. Each chip filters the list to
 *  repos that satisfy the predicate of the chip id:
 *
 *   - `dirty`  — uncommitted changes in the working tree
 *   - `clean`  — no changes, no diverged commits
 *   - `ahead`  — local commits not yet pushed
 *   - `behind` — remote commits not yet pulled
 *
 *  Multiple chips can be active simultaneously (OR-joined). */
export const RepoStatusChip = {
  DIRTY: "dirty",
  CLEAN: "clean",
  AHEAD: "ahead",
  BEHIND: "behind",
} as const;
export type RepoStatusChip = (typeof RepoStatusChip)[keyof typeof RepoStatusChip];

/** Iteration order for UI rendering. */
export const REPO_STATUS_CHIPS = [
  RepoStatusChip.DIRTY,
  RepoStatusChip.CLEAN,
  RepoStatusChip.AHEAD,
  RepoStatusChip.BEHIND,
] as const satisfies readonly RepoStatusChip[];
