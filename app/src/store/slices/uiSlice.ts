import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type ActiveView =
  | "dashboard"
  | "repos"
  | "merge-requests"
  | "dirty"
  | "branches"
  | "activity"
  | "settings";

export interface UiState {
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  activeView: ActiveView;
  selectedRepoId: string | null;
  pinnedRepoIds: string[];
  /** Increments on every manual refresh. Hooks that pull ephemeral data
   *  (e.g. recent commits) depend on this so a header-refresh click rewalks
   *  them too. */
  refreshNonce: number;
  importDialogOpen: boolean;
  findDialogOpen: boolean;
  updaterBanner: { version: string; body: string | null } | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  searchOpen: false,
  activeView: "dashboard",
  selectedRepoId: null,
  pinnedRepoIds: [],
  refreshNonce: 0,
  importDialogOpen: false,
  findDialogOpen: false,
  updaterBanner: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setSearchOpen(state, action: PayloadAction<boolean>) {
      state.searchOpen = action.payload;
    },
    setActiveView(state, action: PayloadAction<ActiveView>) {
      state.activeView = action.payload;
    },
    setSelectedRepo(state, action: PayloadAction<string | null>) {
      state.selectedRepoId = action.payload;
    },
    togglePinnedRepo(state, action: PayloadAction<string>) {
      const idx = state.pinnedRepoIds.indexOf(action.payload);
      if (idx >= 0) state.pinnedRepoIds.splice(idx, 1);
      else state.pinnedRepoIds.push(action.payload);
    },
    bumpRefreshNonce(state) {
      state.refreshNonce += 1;
    },
    setImportDialogOpen(state, action: PayloadAction<boolean>) {
      state.importDialogOpen = action.payload;
    },
    setFindDialogOpen(state, action: PayloadAction<boolean>) {
      state.findDialogOpen = action.payload;
    },
    setUpdaterBanner(
      state,
      action: PayloadAction<{ version: string; body: string | null } | null>,
    ) {
      state.updaterBanner = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setSearchOpen,
  setActiveView,
  setSelectedRepo,
  togglePinnedRepo,
  bumpRefreshNonce,
  setImportDialogOpen,
  setFindDialogOpen,
  setUpdaterBanner,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
