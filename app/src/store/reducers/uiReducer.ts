import { createReducer } from "@reduxjs/toolkit";

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
import type { UiState } from "@/store/types/ui.types";

const initialState: UiState = {
  sidebarCollapsed: false,
  searchOpen: false,
  activeView: "dashboard",
  importDialogOpen: false,
  refreshNonce: 0,
  updaterBanner: null,
  pinnedRepoIds: [],
  selectedRepoId: null,
  onboardingOverride: false,
};

export const uiReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(toggleSidebar, (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    })
    .addCase(setSidebarCollapsed, (state, action) => {
      state.sidebarCollapsed = action.payload;
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
    .addCase(saveSettings.fulfilled, (state, action) => {
      hydrateUiFromBackend(state, action.payload);
    });
});

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
    state.sidebarCollapsed = p.windowState.sidebarCollapsed;
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
