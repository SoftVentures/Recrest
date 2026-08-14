import { createReducer } from "@reduxjs/toolkit";

import { loadBranches } from "@/store/actions/branches.actions";
import {
  deleteRepo,
  forgetReposUnderPath,
  removeRepo,
  repoRemoved,
} from "@/store/actions/repos.actions";
import type { BranchesState } from "@/store/types/branches.types";

const initialState: BranchesState = {
  byRepoId: {},
  loadingRepoIds: [],
};

export const branchesReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(loadBranches.pending, (state, action) => {
      const repoId = action.meta.arg;
      if (!state.loadingRepoIds.includes(repoId)) state.loadingRepoIds.push(repoId);
    })
    .addCase(loadBranches.fulfilled, (state, action) => {
      state.byRepoId[action.payload.repoId] = action.payload.branches;
      state.loadingRepoIds = state.loadingRepoIds.filter((id) => id !== action.payload.repoId);
    })
    .addCase(loadBranches.rejected, (state, action) => {
      state.loadingRepoIds = state.loadingRepoIds.filter((id) => id !== action.meta.arg);
    })
    // Evict cached branches when a repo leaves Recrest, so `byRepoId` doesn't
    // retain orphaned lists for the session (mirrors `reposReducer`).
    .addCase(removeRepo.fulfilled, (state, action) => {
      delete state.byRepoId[action.payload];
    })
    .addCase(deleteRepo.fulfilled, (state, action) => {
      delete state.byRepoId[action.payload];
    })
    .addCase(forgetReposUnderPath.fulfilled, (state, action) => {
      for (const id of action.payload ?? []) {
        delete state.byRepoId[id];
      }
    })
    // The `repo://removed` watcher event bypasses all three thunks above. Only a
    // forgotten removal evicts: a kept record is still a repo the user can act
    // on, and its cached branch list is what the detail pane renders while they
    // decide whether to re-point or remove it.
    .addCase(repoRemoved, (state, action) => {
      if (!action.payload.forgotten) return;
      delete state.byRepoId[action.payload.repoId];
      state.loadingRepoIds = state.loadingRepoIds.filter((id) => id !== action.payload.repoId);
    });
});

export { loadBranches } from "@/store/actions/branches.actions";
export type { BranchesState } from "@/store/types/branches.types";
