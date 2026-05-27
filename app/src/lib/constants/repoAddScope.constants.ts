/**
 * Where a newly added repo lives: alongside the user's other repos in the
 * default scan path (`global`) or in an explicit per-add-scope folder (`local`).
 * Drives the `ScopeToggle` segment in the sidebar.
 */
export const RepoAddScope = {
  LOCAL: "local",
  GLOBAL: "global",
} as const;

export type RepoAddScope = (typeof RepoAddScope)[keyof typeof RepoAddScope];
