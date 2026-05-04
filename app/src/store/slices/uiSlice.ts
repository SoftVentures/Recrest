import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { loadSettings, saveSettings } from "@/store/slices/settingsSlice";

export type ActiveView =
  | "dashboard"
  | "repos"
  | "merge-requests"
  | "dirty"
  | "branches"
  | "activity"
  | "settings";

export interface UpdaterBannerState {
  version: string;
  currentVersion?: string;
  body: string | null;
  canAutoInstall: boolean;
  downloadUrl: string | null;
}

export interface UpdaterProgressState {
  chunk: number;
  total: number | null;
}

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
  updaterBanner: UpdaterBannerState | null;
  updaterProgress: UpdaterProgressState | null;
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
  updaterProgress: null,
};

/** Toggle a repo's pinned state and persist the new list to `settings.json`
 *  via `saveSettings` (Plan 1 §A.5). The reducer flips the local state
 *  optimistically; the thunk reflects the patched list back to disk. The
 *  `extraReducers` below also re-hydrate from the save response, so the UI
 *  stays in sync if the backend rejects or normalises the payload. */
export const togglePinnedRepoPersisted = createAsyncThunk<void, string, { state: { ui: UiState } }>(
  "ui/togglePinnedRepoPersisted",
  async (repoId, { dispatch, getState }) => {
    const current = getState().ui.pinnedRepoIds;
    const next = current.includes(repoId)
      ? current.filter((id) => id !== repoId)
      : [...current, repoId];
    await dispatch(saveSettings({ pinnedRepoIds: next })).unwrap();
  },
);

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
    bumpRefreshNonce(state) {
      state.refreshNonce += 1;
    },
    setImportDialogOpen(state, action: PayloadAction<boolean>) {
      state.importDialogOpen = action.payload;
    },
    setFindDialogOpen(state, action: PayloadAction<boolean>) {
      state.findDialogOpen = action.payload;
    },
    setUpdaterBanner(state, action: PayloadAction<UpdaterBannerState | null>) {
      state.updaterBanner = action.payload;
    },
    setUpdaterProgress(state, action: PayloadAction<UpdaterProgressState | null>) {
      state.updaterProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Hydrate pinned-repo state from persisted settings (Plan 1 §A.5). The
    // settings slice is the source of truth on disk; the UI slice mirrors
    // it so components can read pin state with one selector.
    const hydrate = (state: UiState, payload: { pinnedRepoIds?: string[] }) => {
      if (Array.isArray(payload.pinnedRepoIds)) {
        state.pinnedRepoIds = [...payload.pinnedRepoIds];
      }
    };
    builder
      .addCase(loadSettings.fulfilled, (state, action) => hydrate(state, action.payload))
      .addCase(saveSettings.fulfilled, (state, action) => hydrate(state, action.payload));
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setSearchOpen,
  setActiveView,
  setSelectedRepo,
  bumpRefreshNonce,
  setImportDialogOpen,
  setFindDialogOpen,
  setUpdaterBanner,
  setUpdaterProgress,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
