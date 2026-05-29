import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type Comment,
  type CommentPosition,
  type FileDiff,
  type PrFilters,
  type PullRequest,
  type PullRequestDetail,
  type RepositoryId,
  TauriCommand,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export const setPrs = createAction<{ repoId: RepositoryId; prs: PullRequest[] }>("prs/setPrs");
export const clearPrs = createAction<RepositoryId>("prs/clearPrs");
export const setFilters = createAction<Partial<PrFilters>>("prs/setFilters");
export const resetFilters = createAction("prs/resetFilters");

export const fetchPullRequests = createAsyncThunk<
  { repoId: RepositoryId; prs: PullRequest[] },
  RepositoryId
>("prs/fetch", async (repoId) => {
  const prs = await invoke<PullRequest[]>(TauriCommand.FETCH_PULL_REQUESTS, { repoId });
  return { repoId, prs };
});

export const detailKey = (repoId: RepositoryId, prNumber: number): string =>
  `${repoId}#${prNumber}`;

export const loadPrDetail = createAsyncThunk<
  { key: string; detail: PullRequestDetail },
  { repoId: RepositoryId; prNumber: number }
>("prs/detail", async ({ repoId, prNumber }) => {
  const detail = await invoke<PullRequestDetail>(TauriCommand.GET_PR_DETAIL, { repoId, prNumber });
  return { key: detailKey(repoId, prNumber), detail };
});

export const loadPrDiff = createAsyncThunk<
  { key: string; files: FileDiff[] },
  { repoId: RepositoryId; prNumber: number }
>("prs/diff", async ({ repoId, prNumber }) => {
  const files = await invoke<FileDiff[]>(TauriCommand.GET_PR_DIFF, { repoId, prNumber });
  return { key: detailKey(repoId, prNumber), files };
});

export const postPrComment = createAsyncThunk<
  { key: string; comment: Comment },
  {
    repoId: RepositoryId;
    prNumber: number;
    body: string;
    path?: string;
    position?: CommentPosition;
  }
>("prs/postComment", async ({ repoId, prNumber, body, path, position }) => {
  const comment = await invoke<Comment>(TauriCommand.POST_PR_COMMENT, {
    repoId,
    prNumber,
    body,
    path: path ?? null,
    position: position ?? null,
  });
  return { key: detailKey(repoId, prNumber), comment };
});
