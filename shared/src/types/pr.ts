export type PrState = "open" | "closed" | "merged";
export type CiStatus = "pending" | "running" | "success" | "failure" | "none";

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  author: string;
  state: PrState;
  draft: boolean;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  additions: number | null;
  deletions: number | null;
  ciStatus: CiStatus | null;
}
