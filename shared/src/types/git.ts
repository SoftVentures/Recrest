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

/** One repo that could not be pulled during `git_pull_all`. */
export interface GitPullFailure {
  repoId: string;
  message: string;
}

/** Result of `git_pull_all`. `ok` is the number of repos that pulled
 *  successfully; `failures` lists the ones that refused (dirty working tree,
 *  diverged history, no upstream, auth) so the UI can surface them instead of
 *  reporting a bare success count. */
export interface GitPullAllResult {
  ok: number;
  failures: GitPullFailure[];
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

/** Labelling helper for the structured-fields the settings UI renders.
 *  The backend no longer treats this as a whitelist — `is_valid_config_key`
 *  in `commands/git_config.rs` accepts any key matching git's grammar — so
 *  these constants only exist so the schema in
 *  `app/src/lib/constants/gitConfigSchema.ts` can reference them by name. */
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

/** Snapshot returned by the legacy `get_git_config` / `set_git_config`
 *  commands. `scope` is `"global"` for `~/.gitconfig` reads and `"repo"`
 *  for a repo-local read. `entries` only contains keys that are actually
 *  set in the queried scope — never empty-string placeholders for unset
 *  values. New code should prefer the layered API
 *  (`LIST_GIT_CONFIG_LAYERS` + `GET_GIT_CONFIG_WITH_ORIGINS`). */
export interface GitConfigSnapshot {
  scope: "global" | "repo";
  entries: Partial<Record<GitConfigKey, string>>;
}

/** One file in the layered git-config resolution chain. The chain starts
 *  at `~/.gitconfig` (or the local `.git/config` for a repo scope) and
 *  includes every matching `[includeIf "gitdir:…"]` target. Non-matching
 *  conditional includes are still surfaced with `active = false` so the
 *  UI can list and edit them. */
export interface GitConfigLayer {
  /** Absolute path to the underlying file. */
  path: string;
  /** `null` for the unconditional root layer; otherwise the raw subsection
   *  label of the `[include]` / `[includeIf]` entry that pulled it in
   *  (e.g. `gitdir:~/Developer/work/`). */
  condition: string | null;
  /** `true` when this layer is part of the active resolution chain for
   *  the queried scope. */
  active: boolean;
  /** `true` when the file exists on disk. */
  exists: boolean;
  /** Raw key/value pairs declared by THIS layer's file. Independent of
   *  merge order — when two layers set the same key, both retain their
   *  own value here so per-layer UIs can render without consulting
   *  `origins`. */
  entries: Record<string, string>;
}

/** One key/value pair in the effective config view, with provenance. The
 *  `sourcePath` is the absolute path of the layer file that contributed
 *  the *effective* value (the last matching layer in resolution order). */
export interface GitConfigEntry {
  value: string;
  sourcePath: string;
  sourceCondition: string | null;
}

/** Argument shape for the `ADD_GIT_CONFIG_INCLUDE` command. `condition`
 *  is `null` for an unconditional `[include]`, or the raw `gitdir:…`
 *  pattern for a conditional include. `createTargetSkeleton` writes a
 *  minimal `[user]\n` body to `targetPath` when the file doesn't yet
 *  exist (default: false on the backend). */
export interface GitConfigIncludeRequest {
  configFile: string;
  condition: string | null;
  targetPath: string;
  createTargetSkeleton?: boolean;
}

/** Argument shape for the `REMOVE_GIT_CONFIG_INCLUDE` command. The
 *  matching block in `configFile` is stripped; `deleteTargetFile` opts
 *  into also removing `targetPath` from disk (default: false). */
export interface GitConfigRemoveIncludeRequest {
  configFile: string;
  condition: string | null;
  targetPath: string;
  deleteTargetFile?: boolean;
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
  /** Path relative to the repo root, for display (e.g. `src/foo.ts`). */
  path: string;
  /** Absolute path on disk, for opening the file in the IDE. */
  absolutePath: string;
  line: number;
  column: number;
  snippet: string;
}
