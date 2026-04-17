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
