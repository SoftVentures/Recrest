import type { RepositoryId } from "./repo.js";

/** Kind of PR lifecycle event observed in the 14-day window. */
export type PrEventKind = "opened" | "merged" | "closed";

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
