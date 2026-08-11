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
import {
  deleteRepo,
  forgetReposUnderPath,
  removeRepo,
  repoRemoved,
} from "@/store/actions/repos.actions";
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

/** Recompute the aggregate fields from the per-repo maps that own the truth.
 *  Call after every mutation of `loadingRepoIds` / `errorByRepo`.
 *
 *  `error` takes the **last** entry, not the first: `recordError` re-inserts the
 *  key so object insertion order is oldest→newest, and surfacing the oldest
 *  failure would pin a long-gone outage over the one that just happened. */
function syncAggregates(state: PrsState) {
  state.loading = state.loadingRepoIds.length > 0;
  const errors = Object.values(state.errorByRepo);
  state.error = errors[errors.length - 1] ?? null;
}

/** Record a repo's failure as the newest one. Plain assignment keeps an existing
 *  key in its original insertion slot, so the delete is what makes "newest last"
 *  hold for a repo that already failed earlier. */
function recordError(state: PrsState, repoId: RepositoryId, message: string) {
  delete state.errorByRepo[repoId];
  state.errorByRepo[repoId] = message;
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
      // Clearing a repo's PRs has to clear its loading/error tracking too —
      // leaving either behind desyncs the aggregates from a slice that no longer
      // holds any data for that repo (a stuck spinner, or an error banner about
      // a list that isn't on screen).
      delete state.items[action.payload];
      delete state.errorByRepo[action.payload];
      clearLoading(state, action.payload);
      syncAggregates(state);
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
      recordError(state, repoId, action.error.message ?? "failed to fetch merge requests");
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
    // Every way a repo can leave Recrest has to purge its cached PRs — the same
    // four actions `branchesReducer`, `activityReducer` and `uiReducer` listen
    // to. Missing `forgetReposUnderPath` left the repo's items/detail/diff and,
    // worse, its `errorByRepo` entry behind, which pinned `state.error`
    // non-null for the rest of the session.
    .addCase(removeRepo.fulfilled, (state, action) => purgeRepo(state, action.payload))
    .addCase(deleteRepo.fulfilled, (state, action) => purgeRepo(state, action.payload))
    .addCase(forgetReposUnderPath.fulfilled, (state, action) => {
      for (const id of action.payload ?? []) purgeRepo(state, id);
    })
    // `repo://removed` reaches no thunk. A non-forgotten removal keeps the repo
    // registered (only its folder vanished), so its PR cache stays — the detail
    // pane still renders it while the user decides what to do.
    .addCase(repoRemoved, (state, action) => {
      if (!action.payload.forgotten) return;
      purgeRepo(state, action.payload.repoId);
    });
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
