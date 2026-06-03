export const PrState = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const;
export type PrState = (typeof PrState)[keyof typeof PrState];

export const CiStatus = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILURE: "failure",
  NONE: "none",
} as const;
export type CiStatus = (typeof CiStatus)[keyof typeof CiStatus];

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  author: string;
  /** Author avatar URL as reported by the provider. `null`/omitted for bots
   *  or users where the provider didn't return one; consumers fall back to
   *  the initials chip via `<AuthorAvatar name=… src=…/>`. Optional so
   *  existing test seeds and older snapshots stay valid without manual
   *  migration. */
  authorAvatarUrl?: string | null;
  state: PrState;
  draft: boolean;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  additions: number | null;
  deletions: number | null;
  ciStatus: CiStatus | null;
  /** Plan 1 §A.2: usernames the PR is assigned to. Used to gate
   *  notifications so users only get pinged for PRs they own. Optional —
   *  GitLab/Bitbucket providers may not populate it yet. */
  assignees?: string[];
  /** Plan 1 §A.2: usernames whose review has been requested on this PR.
   *  Treated equivalently to assignees for notification purposes. */
  requestedReviewers?: string[];
}

export const ReviewState = {
  PENDING: "pending",
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
  COMMENTED: "commented",
  DISMISSED: "dismissed",
} as const;
export type ReviewState = (typeof ReviewState)[keyof typeof ReviewState];

export interface Reviewer {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  state: ReviewState;
}

export const FileChangeStatus = {
  ADDED: "added",
  MODIFIED: "modified",
  REMOVED: "removed",
  RENAMED: "renamed",
  COPIED: "copied",
  CHANGED: "changed",
} as const;
export type FileChangeStatus = (typeof FileChangeStatus)[keyof typeof FileChangeStatus];

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: FileChangeStatus;
  diffUrl: string | null;
}

export interface TimelineEvent {
  id: string;
  type: string;
  actor: string | null;
  at: string; // ISO-8601
  body: string | null;
}

/** Full PR detail as returned by `get_pr_detail`. Inherits the base
 *  `PullRequest` fields (flattened by serde on the Rust side). */
export interface PullRequestDetail extends PullRequest {
  body: string | null;
  mergeable: boolean | null;
  reviewers: Reviewer[];
  files: FileChange[];
  timeline: TimelineEvent[];
}

/** UI-only filter state for the merge-requests page. Lives in Redux so it
 *  survives drawer open/close and route changes. */
export interface PrFilters {
  state: ("open" | "merged" | "closed")[];
  ciStatus: CiStatus[];
  draft: "any" | "hide" | "only";
  author: string | null;
}

// ─── Plan 03/04 C.5 — diff + inline comments ───────────────────────────────

export const DiffLineKind = {
  CONTEXT: "context",
  ADD: "add",
  REMOVE: "remove",
} as const;
export type DiffLineKind = (typeof DiffLineKind)[keyof typeof DiffLineKind];

export interface DiffLine {
  kind: DiffLineKind;
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  oldPath: string | null;
  status: FileChangeStatus;
  hunks: DiffHunk[];
}

export const CommentSide = {
  LEFT: "LEFT",
  RIGHT: "RIGHT",
} as const;
export type CommentSide = (typeof CommentSide)[keyof typeof CommentSide];

export interface CommentPosition {
  side: CommentSide;
  line: number;
  startLine: number | null;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  path: string | null;
  createdAt: string; // ISO-8601
}

export const MergeStrategy = {
  MERGE: "merge",
  SQUASH: "squash",
  REBASE: "rebase",
} as const;
export type MergeStrategy = (typeof MergeStrategy)[keyof typeof MergeStrategy];

export interface MergePullRequestInput {
  strategy: MergeStrategy;
  commitTitle: string | null;
  commitMessage: string | null;
  deleteSourceBranch: boolean;
}

export interface MergePullRequestResult {
  merged: boolean;
  mergeSha: string | null;
  sourceBranchDeleted: boolean;
  message: string | null;
}
