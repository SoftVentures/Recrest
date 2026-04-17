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
}

export type ChangedFileStatus = "staged" | "unstaged" | "untracked" | "conflicted";

export interface ChangedFile {
  path: string;
  status: ChangedFileStatus;
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
