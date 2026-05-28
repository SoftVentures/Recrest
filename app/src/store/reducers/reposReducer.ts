import { createReducer } from "@reduxjs/toolkit";

import {
  addRepo,
  deleteRepo,
  gitBranchCreate,
  gitCheckout,
  gitCloneUrl,
  gitCommit,
  gitDiscard,
  gitFetch,
  gitMerge,
  gitPull,
  gitPush,
  gitStage,
  gitStash,
  gitStashDrop,
  gitStashPop,
  gitUnstage,
  loadRepos,
  refreshRepoStatus,
  removeRepo,
  scanForRepos,
  setGroups,
  setRepoSshKey,
  setScanPaths,
  upsertRepo,
} from "@/store/actions/repos.actions";
import { loadSettings, saveSettings } from "@/store/actions/settings.actions";
import type { ReposState } from "@/store/types/repos.types";

const initialState: ReposState = {
  items: {},
  groups: {},
  scanPaths: [],
  loading: false,
  error: null,
};

export const reposReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setScanPaths, (state, action) => {
      state.scanPaths = action.payload;
    })
    // Mirror the persisted scan paths into the repos slice whenever settings
    // load or save, so the Integrations editor and onboarding picker reflect
    // the real backend value instead of starting empty.
    .addCase(loadSettings.fulfilled, (state, action) => {
      state.scanPaths = action.payload.scanPaths;
    })
    .addCase(saveSettings.fulfilled, (state, action) => {
      state.scanPaths = action.payload.scanPaths;
    })
    .addCase(upsertRepo, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(setGroups, (state, action) => {
      state.groups = action.payload;
    })
    .addCase(scanForRepos.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(scanForRepos.fulfilled, (state, action) => {
      state.loading = false;
      for (const repo of action.payload) {
        state.items[repo.id] = repo;
      }
    })
    .addCase(scanForRepos.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? "scan failed";
    })
    .addCase(loadRepos.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(loadRepos.fulfilled, (state, action) => {
      state.loading = false;
      state.items = Object.fromEntries(action.payload.map((r) => [r.id, r]));
    })
    .addCase(loadRepos.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? "load failed";
    })
    .addCase(refreshRepoStatus.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(setRepoSshKey.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(addRepo.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(removeRepo.fulfilled, (state, action) => {
      delete state.items[action.payload];
    })
    .addCase(deleteRepo.fulfilled, (state, action) => {
      delete state.items[action.payload];
    })
    .addCase(gitFetch.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitPull.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitPush.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitCheckout.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitBranchCreate.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitMerge.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.result.status;
    })
    .addCase(gitCloneUrl.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(gitStage.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitUnstage.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitDiscard.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.result.status;
    })
    .addCase(gitStash.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitStashPop.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitStashDrop.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    })
    .addCase(gitCommit.fulfilled, (state, action) => {
      const repo = state.items[action.payload.repoId];
      if (repo) repo.status = action.payload.status;
    });
});

export {
  addRepo,
  deleteRepo,
  gitBranchCreate,
  gitCheckout,
  gitCloneUrl,
  gitFetch,
  gitMerge,
  gitPull,
  gitPush,
  loadRepos,
  refreshRepoStatus,
  removeRepo,
  scanForRepos,
  setGroups,
  setRepoSshKey,
  setScanPaths,
  upsertRepo,
} from "@/store/actions/repos.actions";

export type { ReposState } from "@/store/types/repos.types";
