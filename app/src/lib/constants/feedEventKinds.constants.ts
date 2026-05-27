/**
 * Discriminator literals for `FeedEvent.kind` in the activity Timeline.
 *
 * The activity feed merges three event streams (commits, PR events, CI check
 * summaries) into one chronological list. Each `FeedEvent` carries one of
 * these tags so the renderer can pick the right icon, body layout, and link
 * target.
 *
 * `FeedFilterKind` adds a fourth value (`"all"`) for the toolbar's "show
 * everything" toggle, plus pluralised forms (`commits`, `prs`, `checks`) so
 * the toolbar's pill labels match the filter state directly.
 */
export const FeedEventKind = {
  COMMIT: "commit",
  PR: "pr",
  CHECK: "check",
} as const;

export type FeedEventKind = (typeof FeedEventKind)[keyof typeof FeedEventKind];

export const FeedFilterKind = {
  ALL: "all",
  COMMITS: "commits",
  PRS: "prs",
  CHECKS: "checks",
} as const;

export type FeedFilterKind = (typeof FeedFilterKind)[keyof typeof FeedFilterKind];
