import { CiStatus, PrState, type PullRequest, type Repository } from "@recrest/shared";

/** Stable id reused across the burst so the Redux store can target it for cleanup. */
export const BURST_REPO_ID = "dev-burst";

/** Synthetic PR for the developer notification-burst playground. */
export function makeBurstPr(index: number): PullRequest {
  const now = new Date().toISOString();
  return {
    id: `${BURST_REPO_ID}#${index}`,
    number: index,
    title: `Demo burst #${index}`,
    url: `https://example.com/pr/${index}`,
    author: "demo-bot",
    authorAvatarUrl: null,
    state: PrState.OPEN,
    draft: false,
    sourceBranch: `feature/demo-${index}`,
    targetBranch: "main",
    createdAt: now,
    updatedAt: now,
    additions: 10,
    deletions: 2,
    ciStatus: CiStatus.PENDING,
  };
}

/** Synthetic repo so the burst PRs render under a recognisable container. */
export function makeBurstRepo(): Repository {
  return {
    id: BURST_REPO_ID,
    name: "dev-burst",
    path: "/dev/null/dev-burst",
    groupId: null,
    remoteUrl: null,
    providerId: null,
    status: {
      branch: "main",
      head: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      dirty: false,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [],
      changedFilesTruncated: false,
      commitActivity: new Array(14).fill(0) as number[],
      addedLines: 0,
      removedLines: 0,
      language: null,
      languages: null,
    },
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
  };
}
