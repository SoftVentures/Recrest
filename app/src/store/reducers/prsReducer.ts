import { createReducer } from "@reduxjs/toolkit";

import type { PrFilters, RepositoryId } from "@recrest/shared";

import {
  clearPrs,
  detailKey,
  fetchPullRequests,
  loadPrDetail,
  loadPrDiff,
  postPrComment,
  resetFilters,
  setFilters,
  setPrs,
} from "@/store/actions/prs.actions";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import type { PrsState } from "@/store/types/prs.types";

const initialFilters: PrFilters = {
  state: ["open"],
  ciStatus: [],
  draft: "any",
  author: null,
};

const initialState: PrsState = {
  items: {},
  detail: {},
  detailLoading: {},
  diff: {},
  diffLoading: {},
  comments: {},
  loadingRepoIds: [],
  errorByRepo: {},
  loading: false,
  error: null,
  lastFetched: null,
  filters: initialFilters,
};

/** Recompute the two aggregate fields the app-wide chrome still reads
 *  (`s.prs.loading` / `s.prs.error`) from the per-repo maps that own the
 *  truth. Call after every mutation of `loadingRepoIds` / `errorByRepo`. */
function syncAggregates(state: PrsState) {
  state.loading = state.loadingRepoIds.length > 0;
  state.error = Object.values(state.errorByRepo)[0] ?? null;
}

function clearLoading(state: PrsState, repoId: RepositoryId) {
  state.loadingRepoIds = state.loadingRepoIds.filter((id) => id !== repoId);
}

function purgeRepo(state: PrsState, repoId: RepositoryId) {
  delete state.items[repoId];
  delete state.errorByRepo[repoId];
  clearLoading(state, repoId);
  const prefix = `${repoId}#`;
  for (const map of [
    state.detail,
    state.detailLoading,
    state.diff,
    state.diffLoading,
    state.comments,
  ]) {
    for (const key of Object.keys(map)) {
      if (key.startsWith(prefix)) delete map[key];
    }
  }
  syncAggregates(state);
}

export const prsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setPrs, (state, action) => {
      state.items[action.payload.repoId] = action.payload.prs;
    })
    .addCase(clearPrs, (state, action) => {
      delete state.items[action.payload];
    })
    .addCase(setFilters, (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    })
    .addCase(resetFilters, (state) => {
      state.filters = initialFilters;
    })
    .addCase(fetchPullRequests.pending, (state, action) => {
      const repoId = action.meta.arg;
      if (!state.loadingRepoIds.includes(repoId)) state.loadingRepoIds.push(repoId);
      delete state.errorByRepo[repoId];
      syncAggregates(state);
    })
    .addCase(fetchPullRequests.fulfilled, (state, action) => {
      const { repoId, prs } = action.payload;
      clearLoading(state, repoId);
      delete state.errorByRepo[repoId];
      state.items[repoId] = prs;
      state.lastFetched = Date.now();
      syncAggregates(state);
    })
    .addCase(fetchPullRequests.rejected, (state, action) => {
      const repoId = action.meta.arg;
      clearLoading(state, repoId);
      state.errorByRepo[repoId] = action.error.message ?? "failed to fetch merge requests";
      syncAggregates(state);
    })
    .addCase(loadPrDetail.pending, (state, action) => {
      state.detailLoading[detailKey(action.meta.arg.repoId, action.meta.arg.prNumber)] = true;
    })
    .addCase(loadPrDetail.fulfilled, (state, action) => {
      state.detail[action.payload.key] = action.payload.detail;
      state.detailLoading[action.payload.key] = false;
    })
    .addCase(loadPrDetail.rejected, (state, action) => {
      const k = detailKey(action.meta.arg.repoId, action.meta.arg.prNumber);
      state.detailLoading[k] = false;
    })
    .addCase(loadPrDiff.pending, (state, action) => {
      state.diffLoading[detailKey(action.meta.arg.repoId, action.meta.arg.prNumber)] = true;
    })
    .addCase(loadPrDiff.fulfilled, (state, action) => {
      state.diff[action.payload.key] = action.payload.files;
      state.diffLoading[action.payload.key] = false;
    })
    .addCase(loadPrDiff.rejected, (state, action) => {
      const k = detailKey(action.meta.arg.repoId, action.meta.arg.prNumber);
      state.diffLoading[k] = false;
    })
    .addCase(postPrComment.fulfilled, (state, action) => {
      const existing = state.comments[action.payload.key] ?? [];
      state.comments[action.payload.key] = [...existing, action.payload.comment];
    })
    .addCase(removeRepo.fulfilled, (state, action) => purgeRepo(state, action.payload))
    .addCase(deleteRepo.fulfilled, (state, action) => purgeRepo(state, action.payload));
});

export {
  clearPrs,
  detailKey,
  fetchPullRequests,
  loadPrDetail,
  loadPrDiff,
  postPrComment,
  resetFilters,
  setFilters,
  setPrs,
} from "@/store/actions/prs.actions";

export type { PrsState } from "@/store/types/prs.types";
