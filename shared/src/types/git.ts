import type { RepositoryStatus } from "./repo.js";

/**
 * System-git detection result returned by the Rust `check_git` command.
 * Recrest itself uses a vendored libgit2 for reads, so `installed: false`
 * is never blocking — it just means fetch/pull-style features that may
 * shell out to git in the future would be unavailable.
 */
export interface GitInfo {
  installed: boolean;
  /** Parsed `git --version` (e.g. "2.42.0"). */
  version: string | null;
  /** Absolute path to the binary, resolved via `which`/`where`. */
  path: string | null;
}

export type GitMergeState = "up_to_date" | "fast_forward" | "merged" | "conflicted";

/** Result of `git_merge`. `conflicts` lists paths with unresolved markers;
 *  when non-empty the repo is left in a merging state so the user can
 *  resolve in their IDE. */
export interface GitMergeResult {
  status: RepositoryStatus;
  state: GitMergeState;
  conflicts: string[];
}

export interface BranchCommit {
  sha: string;
  summary: string;
  author: string;
  /** ISO-8601 UTC timestamp. */
  timestamp: string;
}

/** One entry from `git_list_branches`. Either a local branch (optionally
 *  with an upstream) or a remote-tracking branch that isn't anyone's
 *  upstream yet. */
export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  /** Remote name (e.g. "origin") for remote branches; null for local. */
  remote: string | null;
  /** Short upstream ref (e.g. "origin/main"); null for local branches
   *  without a tracking branch or for remote entries themselves. */
  upstream: string | null;
  ahead: number;
  behind: number;
  clean: boolean;
  lastCommit: BranchCommit | null;
}

/** One hit returned by `find_across_repos`. `column` is 1-based. */
export interface SearchHit {
  repoId: string;
  repoName: string;
  path: string;
  line: number;
  column: number;
  snippet: string;
}
