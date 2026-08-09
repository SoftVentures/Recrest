import { createReducer } from "@reduxjs/toolkit";

import {
  addRepo,
  backgroundScanForRepos,
  clearRepoLogo,
  deleteRepo,
  forgetReposUnderPath,
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
  repoRemoved,
  scanForRepos,
  setGroups,
  setRepoLogo,
  setRepoLogoSvg,
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
      // scan_repos returns the FULL authoritative repo set (discovered +
      // surviving manual adds, orphans pruned), so replace wholesale — a merge
      // would leave pruned orphan rows lingering in the dashboard.
      state.items = Object.fromEntries(action.payload.map((r) => [r.id, r]));
    })
    .addCase(scanForRepos.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? "scan failed";
    })
    // The unattended rescan deliberately handles only `fulfilled`: touching
    // `loading` would blink the header refresh indicator (and disable its
    // button) every 10 minutes and on every alt-tab, and touching `error` would
    // pop a failure banner for work the user never started. A silent trigger
    // may update data, never chrome.
    .addCase(backgroundScanForRepos.fulfilled, (state, action) => {
      state.items = Object.fromEntries(action.payload.map((r) => [r.id, r]));
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
    .addCase(setRepoLogo.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(setRepoLogoSvg.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(clearRepoLogo.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(addRepo.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
    })
    .addCase(removeRepo.fulfilled, (state, action) => {
      delete state.items[action.payload];
    })
    .addCase(forgetReposUnderPath.fulfilled, (state, action) => {
      // `?? []` guards the web dev-stub / any future backend that resolves
      // null instead of an empty id array — `for…of null` would throw.
      for (const id of action.payload ?? []) {
        delete state.items[id];
      }
    })
    .addCase(deleteRepo.fulfilled, (state, action) => {
      delete state.items[action.payload];
    })
    .addCase(repoRemoved, (state, action) => {
      const { repoId, forgotten } = action.payload;
      // Forgotten means the backend also dropped the record from settings.json,
      // so there is nothing left to point the row at. A kept record (manually
      // added repo) only lost its folder — keeping the row flagged lets the user
      // re-point or remove it deliberately instead of silently losing it.
      if (forgotten) {
        delete state.items[repoId];
        return;
      }
      const repo = state.items[repoId];
      if (repo) repo.missing = true;
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
  backgroundScanForRepos,
  clearRepoLogo,
  deleteRepo,
  forgetReposUnderPath,
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
  repoRemoved,
  scanForRepos,
  setGroups,
  setRepoLogo,
  setRepoLogoSvg,
  setRepoSshKey,
  setScanPaths,
  upsertRepo,
} from "@/store/actions/repos.actions";

export type { ReposState } from "@/store/types/repos.types";
