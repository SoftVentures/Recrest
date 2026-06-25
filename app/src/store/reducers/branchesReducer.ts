import { createReducer } from "@reduxjs/toolkit";

import { loadBranches } from "@/store/actions/branches.actions";
import { deleteRepo, forgetReposUnderPath, removeRepo } from "@/store/actions/repos.actions";
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
    });
});

export { loadBranches } from "@/store/actions/branches.actions";
export type { BranchesState } from "@/store/types/branches.types";
