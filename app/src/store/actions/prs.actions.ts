import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
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
