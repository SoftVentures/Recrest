import type { ProviderId } from "../constants/providers.js";

export type RepositoryId = string;
export type RepositoryGroupId = string;

export interface Repository {
  id: RepositoryId;
  name: string;
  path: string;
  groupId: RepositoryGroupId | null;
  remoteUrl: string | null;
  providerId: ProviderId | null;
  status: RepositoryStatus;
  /** Auto-detected logo path inside the repo (see `git::logo::detect_repo_logo`).
   *  Null when the repo doesn't ship one. Fetch its bytes via `load_logo_bytes`. */
  logoPath: string | null;
  logoDarkPath: string | null;
}

export interface LogoBlob {
  mimeType: string;
  /** Base64-encoded image bytes. Turn into a data URI with
   *  `` `data:${mimeType};base64,${data}` ``. */
  data: string;
}

export interface RepositoryStatus {
  branch: string | null;
  head: string | null;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  dirty: boolean;
  lastCommit: CommitInfo | null;
  remoteUrl: string | null;
  /** Per-file working-tree state, capped server-side (see `changedFilesTruncated`). */
  changedFiles: ChangedFile[];
  /** True when the Rust side skipped some entries because the list exceeded its cap. */
  changedFilesTruncated: boolean;
  /** Commits per day over the last 14 days (local-time buckets).
   *  `commitActivity[13]` is today, `[0]` is 13 days ago. */
  commitActivity: number[];
  /** Total line additions across HEAD → index → workdir diff. */
  addedLines: number;
  removedLines: number;
  /** Dominant language id (maps to LANGS in the app), null for empty repos. */
  language: string | null;
  /** Per-language byte share (matches GitHub's /languages endpoint shape).
   *  Keys are language names, values are bytes OR pre-normalised 0..1
   *  fractions — consumers should normalise before use. Null when the
   *  scanner hasn't emitted a breakdown for this repo. */
  languages: Record<string, number> | null;
}

export interface RecentCommit {
  sha: string;
  summary: string;
  author: string;
  /** Commit author email — used by the UI to derive Gravatar-based avatars.
   *  Null when git2 couldn't read an email (e.g. for signed-off commits
   *  with a redacted author). */
  authorEmail: string | null;
  timestamp: string; // ISO-8601
  repoId: RepositoryId;
  repoName: string;
}

export type ChangedFileStatus = "staged" | "unstaged" | "untracked" | "conflicted";

/** Art der Änderung (unabhängig vom Staging-State) — treibt die Farbgebung
 *  der Working-Tree-Liste im Frontend. */
export type ChangedFileKind = "added" | "modified" | "deleted" | "renamed" | "typechange";

export interface ChangedFile {
  path: string;
  status: ChangedFileStatus;
  kind: ChangedFileKind;
  /** True when a file is both staged *and* has further unstaged edits. */
  hasUnstagedChanges: boolean;
}

export interface CommitInfo {
  sha: string;
  summary: string;
  author: string;
  timestamp: string; // ISO-8601
}

export interface RepositoryGroup {
  id: RepositoryGroupId;
  name: string;
  color: string; // hex/oklch string
}

/** Payload for the `repo://status` Tauri event. */
export interface RepoStatusEventPayload {
  repoId: RepositoryId;
  status: RepositoryStatus;
}
