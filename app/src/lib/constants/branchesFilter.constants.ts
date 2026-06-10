/**
 * Filter discriminators for the Branches page toolbar.
 *
 * `TrackingFlag` filters the branch list by upstream tracking state; `LocationFlag`
 * filters by whether a branch is local-only or also tracked on a remote. Both
 * are page-local enums but used in multiple places (toolbar pills, filter
 * function, BranchRowItem chips), so they live here rather than re-declared
 * inline.
 */
export const TrackingFlag = {
  AHEAD: "ahead",
  BEHIND: "behind",
  CLEAN: "clean",
} as const;
export type TrackingFlag = (typeof TrackingFlag)[keyof typeof TrackingFlag];

export const LocationFlag = {
  LOCAL: "local",
  REMOTE: "remote",
} as const;
export type LocationFlag = (typeof LocationFlag)[keyof typeof LocationFlag];
