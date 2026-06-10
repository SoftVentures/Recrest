import type { RecentCommit, RepositoryId } from "./repo.js";

/** ISO-8601 UTC strings, `since <= until`. */
export interface ActivityRange {
  since: string;
  until: string;
}

/** One streamed batch from `list_commits`. `done` marks the final chunk for
 *  a repo within the request; `truncated` means the per-repo cap was hit. */
export interface CommitsChunkPayload {
  requestId: string;
  repoId: string;
  commits: RecentCommit[];
  done: boolean;
  truncated: boolean;
}

/** One-shot return value of `list_commits` — totals per repo after the
 *  stream completed. Commit data itself only travels via chunk events. */
export interface ListCommitsSummary {
  requestId: string;
  totals: Record<string, number>;
  truncated: Record<string, boolean>;
}

/** Kind of PR lifecycle event observed in the 14-day window. */
export const PrEventKind = {
  OPENED: "opened",
  MERGED: "merged",
  CLOSED: "closed",
} as const;
export type PrEventKind = (typeof PrEventKind)[keyof typeof PrEventKind];

/** A single state transition on a pull/merge request within the activity window. */
export interface PrEvent {
  repoId: RepositoryId;
  repoName: string;
  number: number;
  title: string;
  author: string;
  kind: PrEventKind;
  /** ISO-8601 timestamp of the transition. */
  timestamp: string;
  url: string;
}

/** Aggregated CI check-run result bucketed per local day, per repo. */
export interface CheckRunSummary {
  repoId: RepositoryId;
  repoName: string;
  /** YYYY-MM-DD in the user's local time zone. */
  day: string;
  total: number;
  passed: number;
  failed: number;
  /** Up to three failing commit SHAs for drill-in from the UI. */
  shaSamples: string[];
}
