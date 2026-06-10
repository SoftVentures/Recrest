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

/**
 * One diff line addressed on both sides of a hunk. Lines that exist on only
 * one side (pure add / pure remove) still carry the running counterpart of the
 * absent side, resolved by the frontend from the hunk — GitLab's `line_code`
 * needs both numbers for every boundary line of a range.
 */
export interface CommentLineRef {
  oldLineNo: number | null;
  newLineNo: number | null;
}

/**
 * One boundary of a comment range. `side` picks which number is this line's
 * anchor (RIGHT = post-change/new line, LEFT = pre-change/old line). Carries
 * both numbers because GitLab's `line_code` needs the full pair. Start and end
 * can sit on *different* sides — a range may run from a deleted (LEFT) line to
 * an added (RIGHT) one, exactly like GitHub/GitLab.
 */
export interface CommentAnchor {
  side: CommentSide;
  oldLineNo: number | null;
  newLineNo: number | null;
}

/**
 * Where an inline review comment anchors. `start` is the first line of a
 * multi-line range; `null` means a single-line comment anchored at `end`.
 * `end` is always the last (anchor) line — the comment renders there.
 */
export interface CommentPosition {
  start: CommentAnchor | null;
  end: CommentAnchor;
}

export interface Comment {
  id: string;
  author: string;
  /** Provider avatar URL of the author, when the API returned one. */
  authorAvatarUrl: string | null;
  body: string;
  path: string | null;
  /** Anchor (end) side, or `null` for a general (non-inline) comment. */
  side: CommentSide | null;
  /** Anchor (end) line number on `side`, or `null` for a general comment. */
  line: number | null;
  /** First line of the range, on `startSide`; `null` for single-line/general. */
  startLine: number | null;
  /** Side of the range's first line (may differ from `side`); `null` if none. */
  startSide: CommentSide | null;
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
