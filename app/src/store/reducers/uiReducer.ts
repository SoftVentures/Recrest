import { createReducer } from "@reduxjs/toolkit";

import {
  deleteRepo,
  forgetReposUnderPath,
  removeRepo,
  repoRemoved,
} from "@/store/actions/repos.actions";
import { loadSettings, saveSettings } from "@/store/actions/settings.actions";
import {
  bumpRefreshNonce,
  setActiveView,
  setImportDialogOpen,
  setOnboardingOverride,
  setPinnedRepos,
  setSearchOpen,
  setSelectedRepo,
  setSidebarCollapsed,
  setUpdaterBanner,
  togglePinnedRepo,
  toggleSidebar,
} from "@/store/actions/ui.actions";
import { INITIAL_SAVE_SEQ, acceptSaveSnapshot } from "@/store/reducers/saveSettingsSeq";
import type { UiState } from "@/store/types/ui.types";

const initialState: UiState = {
  sidebarCollapsed: false,
  sidebarCollapsedPref: false,
  sidebarAutoCollapsed: false,
  searchOpen: false,
  activeView: "dashboard",
  importDialogOpen: false,
  refreshNonce: 0,
  updaterBanner: null,
  pinnedRepoIds: [],
  selectedRepoId: null,
  onboardingOverride: false,
  lastAppliedSaveSeq: INITIAL_SAVE_SEQ,
};

export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(toggleSidebar, (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      state.sidebarCollapsedPref = state.sidebarCollapsed;
      state.sidebarAutoCollapsed = false;
    })
    .addCase(setSidebarCollapsed, (state, action) => {
      state.sidebarCollapsed = action.payload;
      if (action.meta.forced) {
        state.sidebarAutoCollapsed = true;
        return;
      }
      // Releasing the forced collapse (transient, `forced: false`) restores the
      // preference without rewriting it; anything else is the user choosing.
      state.sidebarAutoCollapsed = false;
      if (!action.meta.transient) state.sidebarCollapsedPref = action.payload;
    })
    .addCase(setSearchOpen, (state, action) => {
      state.searchOpen = action.payload;
    })
    .addCase(setActiveView, (state, action) => {
      state.activeView = action.payload;
    })
    .addCase(setImportDialogOpen, (state, action) => {
      state.importDialogOpen = action.payload;
    })
    .addCase(bumpRefreshNonce, (state) => {
      state.refreshNonce += 1;
    })
    .addCase(setUpdaterBanner, (state, action) => {
      state.updaterBanner = action.payload;
    })
    .addCase(togglePinnedRepo, (state, action) => {
      const id = action.payload;
      const idx = state.pinnedRepoIds.indexOf(id);
      if (idx >= 0) state.pinnedRepoIds.splice(idx, 1);
      else state.pinnedRepoIds.push(id);
    })
    .addCase(setPinnedRepos, (state, action) => {
      state.pinnedRepoIds = action.payload;
    })
    .addCase(setSelectedRepo, (state, action) => {
      state.selectedRepoId = action.payload;
    })
    .addCase(setOnboardingOverride, (state, action) => {
      state.onboardingOverride = action.payload;
    })
    // Phase 2: hydrate UI-scoped persisted fields from the Tauri backend.
    // `sidebarCollapsed` lives under `windowState`, `pinnedRepoIds` stays
    // top-level for legacy reasons. Either may be missing on older
    // `settings.json` files; we fall back to the current store value so a
    // partial backend payload doesn't reset the user's session.
    .addCase(loadSettings.fulfilled, (state, action) => {
      hydrateUiFromBackend(state, action.payload);
    })
    // A superseded `update_settings` response must not replay its older
    // snapshot over the newest one this slice already applied.
    .addCase(saveSettings.fulfilled, (state, action) => {
      if (!acceptSaveSnapshot(state, action.meta)) return;
      hydrateUiFromBackend(state, action.payload);
    })
    // A repo that left Recrest must not stay pinned to the sidebar, and
    // `selectedRepoId` must not keep pointing at a record no reducer holds
    // any more. Every slice that caches per-repo data purges on the same four
    // actions — `branchesReducer`, `prsReducer` and `activityReducer` do the
    // same, `repoRemoved` included.
    .addCase(removeRepo.fulfilled, (state, action) => {
      pruneRepos(state, [action.payload]);
    })
    .addCase(deleteRepo.fulfilled, (state, action) => {
      pruneRepos(state, [action.payload]);
    })
    .addCase(forgetReposUnderPath.fulfilled, (state, action) => {
      pruneRepos(state, action.payload ?? []);
    })
    // The watcher's `repo://removed` event is the fourth way a repo leaves, and
    // it bypasses every thunk above. Only a *forgotten* removal drops the
    // record: a kept one (`forgotten: false`) merely flags the repo missing, so
    // the row, its pin and the selection must survive — the user still has to be
    // able to find it in the sidebar to re-point or remove it deliberately.
    .addCase(repoRemoved, (state, action) => {
      if (!action.payload.forgotten) return;
      pruneRepos(state, [action.payload.repoId]);
    });
});

function pruneRepos(state: UiState, repoIds: readonly string[]): void {
  if (repoIds.length === 0) return;
  const gone = new Set(repoIds);
  state.pinnedRepoIds = state.pinnedRepoIds.filter((id) => !gone.has(id));
  if (state.selectedRepoId && gone.has(state.selectedRepoId)) state.selectedRepoId = null;
}

function hydrateUiFromBackend(state: UiState, payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const p = payload as {
    pinnedRepoIds?: unknown;
    windowState?: { sidebarCollapsed?: unknown };
  };
  if (Array.isArray(p.pinnedRepoIds)) {
    state.pinnedRepoIds = p.pinnedRepoIds.filter((id): id is string => typeof id === "string");
  }
  if (p.windowState && typeof p.windowState.sidebarCollapsed === "boolean") {
    state.sidebarCollapsedPref = p.windowState.sidebarCollapsed;
    // A viewport-forced collapse outranks the stored preference. Applying it
    // here would expand the sidebar on a compact window, and the responsive
    // effect keys on the viewport class — which did not change — so nothing
    // would ever collapse it again for the rest of the session. The preference
    // is still recorded above and gets applied the moment the collapse is
    // released.
    if (!state.sidebarAutoCollapsed) state.sidebarCollapsed = p.windowState.sidebarCollapsed;
  }
}

// Re-export so existing `@/store/reducers/uiReducer` action imports keep working.
export {
  bumpRefreshNonce,
  setActiveView,
  setImportDialogOpen,
  setPinnedRepos,
  setSearchOpen,
  setSelectedRepo,
  setSidebarCollapsed,
  setUpdaterBanner,
  togglePinnedRepo,
  toggleSidebar,
} from "@/store/actions/ui.actions";

export type { ActiveView, UiState, UpdaterBannerState } from "@/store/types/ui.types";
