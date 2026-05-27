import { createReducer } from "@reduxjs/toolkit";

import type { PrFilters, RepositoryId } from "@recrest/shared";

import {
  clearPrs,
  detailKey,
  fetchPullRequests,
  loadPrDetail,
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
  loading: false,
  error: null,
  lastFetched: null,
  filters: initialFilters,
};

function purgeRepo(state: PrsState, repoId: RepositoryId) {
  delete state.items[repoId];
  const prefix = `${repoId}#`;
  for (const key of Object.keys(state.detail)) {
    if (key.startsWith(prefix)) delete state.detail[key];
  }
  for (const key of Object.keys(state.detailLoading)) {
    if (key.startsWith(prefix)) delete state.detailLoading[key];
  }
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
    .addCase(fetchPullRequests.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(fetchPullRequests.fulfilled, (state, action) => {
      state.loading = false;
      state.items[action.payload.repoId] = action.payload.prs;
      state.lastFetched = Date.now();
    })
    .addCase(fetchPullRequests.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? "failed to fetch merge requests";
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
    .addCase(removeRepo.fulfilled, (state, action) => purgeRepo(state, action.payload))
    .addCase(deleteRepo.fulfilled, (state, action) => purgeRepo(state, action.payload));
});

export {
  clearPrs,
  detailKey,
  fetchPullRequests,
  loadPrDetail,
  resetFilters,
  setFilters,
  setPrs,
} from "@/store/actions/prs.actions";

export type { PrsState } from "@/store/types/prs.types";
