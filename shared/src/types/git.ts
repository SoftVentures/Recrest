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

/** Whitelisted set of git config keys the UI is allowed to read/write.
 *  Mirrors the Rust `WHITELIST` in `commands/git_config.rs`; keeping the
 *  string-union in one place lets the form know which fields to render. */
export const GitConfigKey = {
  USER_NAME: "user.name",
  USER_EMAIL: "user.email",
  CORE_EDITOR: "core.editor",
  CORE_AUTOCRLF: "core.autocrlf",
  INIT_DEFAULT_BRANCH: "init.defaultBranch",
  PULL_REBASE: "pull.rebase",
  COMMIT_GPGSIGN: "commit.gpgsign",
} as const;
export type GitConfigKey = (typeof GitConfigKey)[keyof typeof GitConfigKey];

/** Snapshot returned by `get_git_config` / `set_git_config`. `scope` is
 *  `"global"` for `~/.gitconfig` reads and `"repo"` for a repo-local read.
 *  `entries` only contains keys that are actually set in the queried scope
 *  — never empty-string placeholders for unset values. */
export interface GitConfigSnapshot {
  scope: "global" | "repo";
  entries: Partial<Record<GitConfigKey, string>>;
}

/** One stash entry as returned by `git_stash_list`. `index` is the stack
 *  position git uses (`stash@{N}`); use it with `git_stash_pop` /
 *  `git_stash_drop`. `oid` is the underlying commit hash. */
export interface StashEntry {
  index: number;
  message: string;
  oid: string;
}

/** Result of `git_discard`. `requiresConfirmation` lists untracked paths
 *  that look like secrets (`.env*`, `id_*`, `*.pem`) and were skipped on
 *  this attempt; the UI re-invokes with `force: true` after the user
 *  confirms. `status` is the refreshed working-tree state. */
export interface DiscardResult {
  discarded: string[];
  requiresConfirmation: string[];
  status: RepositoryStatus;
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
