export type PrState = "open" | "closed" | "merged";
export type CiStatus = "pending" | "running" | "success" | "failure" | "none";

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

export type ReviewState = "pending" | "approved" | "changes_requested" | "commented" | "dismissed";

export interface Reviewer {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  state: ReviewState;
}

export type FileChangeStatus = "added" | "modified" | "removed" | "renamed" | "copied" | "changed";

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
