import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import type { RepoListSort } from "@recrest/shared";

import { deleteRepo, removeRepo } from "@/store/slices/reposSlice";
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

export type RepoStatusChip = "dirty" | "clean" | "ahead" | "behind";

export interface RepoFilterSlot {
  sort: RepoListSort;
  statusChips: RepoStatusChip[];
}

export type RepoFilterPage = "repos" | "changes";

const emptyRepoFilterSlot: RepoFilterSlot = {
  sort: { field: "", direction: "asc" },
  statusChips: [],
};

export interface UiState {
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  activeView: ActiveView;
  selectedRepoId: string | null;
  /** Format `${repoId}#${prNumber}`. Drives the inline MR detail pane in
   *  AppShell so the panel envelope matches `.a-detail` on /repos. */
  selectedPrKey: string | null;
  pinnedRepoIds: string[];
  /** Increments on every manual refresh. Hooks that pull ephemeral data
   *  (e.g. recent commits) depend on this so a header-refresh click rewalks
   *  them too. */
  refreshNonce: number;
  importDialogOpen: boolean;
  findDialogOpen: boolean;
  updaterBanner: UpdaterBannerState | null;
  updaterProgress: UpdaterProgressState | null;
  /** Per-page filter + sort state. Held in memory only — distinct from
   *  `settings.repoListSort` (deprecated for this page) so /repos and
   *  /changes don't share their filter selections. */
  repoFilters: Record<RepoFilterPage, RepoFilterSlot>;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  searchOpen: false,
  activeView: "dashboard",
  selectedRepoId: null,
  selectedPrKey: null,
  pinnedRepoIds: [],
  refreshNonce: 0,
  importDialogOpen: false,
  findDialogOpen: false,
  updaterBanner: null,
  updaterProgress: null,
  repoFilters: {
    repos: { ...emptyRepoFilterSlot },
    changes: { ...emptyRepoFilterSlot },
  },
};

/** Toggle a repo's pinned state and persist the new list to `settings.json`
 *  via `saveSettings` (Plan 1 §A.5). The slice flips `ui.pinnedRepoIds`
 *  optimistically on `pending`, the thunk writes the patched list to disk,
 *  and a `rejected` handler reverts the toggle if the save fails so the UI
 *  never drifts from persisted state. The `saveSettings.fulfilled` hydrator
 *  re-syncs from the backend response on success in case the server
 *  normalises the payload. */
export const togglePinnedRepoPersisted = createAsyncThunk<void, string, { state: { ui: UiState } }>(
  "ui/togglePinnedRepoPersisted",
  async (_repoId, { dispatch, getState }) => {
    // State was already flipped by the `pending` reducer below — read the
    // post-flip list so we persist what the UI is showing.
    const next = getState().ui.pinnedRepoIds;
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
    setSelectedPr(state, action: PayloadAction<string | null>) {
      state.selectedPrKey = action.payload;
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
    setRepoFilterSort(state, action: PayloadAction<{ page: RepoFilterPage; sort: RepoListSort }>) {
      state.repoFilters[action.payload.page].sort = action.payload.sort;
    },
    toggleRepoStatusChip(
      state,
      action: PayloadAction<{ page: RepoFilterPage; chip: RepoStatusChip }>,
    ) {
      const slot = state.repoFilters[action.payload.page];
      const idx = slot.statusChips.indexOf(action.payload.chip);
      if (idx === -1) slot.statusChips.push(action.payload.chip);
      else slot.statusChips.splice(idx, 1);
    },
  },
  extraReducers: (builder) => {
    // Hydrate pinned-repo state from persisted settings (Plan 1 §A.5). The
    // settings slice is the source of truth on disk; the UI slice mirrors
    // it so components can read pin state with one selector.
    //
    // `payload` is guarded because `saveSettings` may resolve with `undefined`
    // when the backend stub (dev:web) or a future no-op Tauri command
    // returns nothing — without the guard the reducer threw and froze the
    // store on every settings write (e.g. clicking the Card view toggle).
    const hydrate = (state: UiState, payload: { pinnedRepoIds?: string[] } | undefined) => {
      if (payload && Array.isArray(payload.pinnedRepoIds)) {
        state.pinnedRepoIds = [...payload.pinnedRepoIds];
      }
    };
    // Flip the local pin set on the optimistic branches of
    // `togglePinnedRepoPersisted`. `pending` applies the toggle so the UI
    // updates instantly; `rejected` undoes it if the save thunk failed, so
    // the visible state never drifts from `settings.json`.
    const flipPin = (state: UiState, repoId: string) => {
      const idx = state.pinnedRepoIds.indexOf(repoId);
      if (idx === -1) state.pinnedRepoIds = [...state.pinnedRepoIds, repoId];
      else state.pinnedRepoIds = state.pinnedRepoIds.filter((_, i) => i !== idx);
    };
    const purgeRepo = (state: UiState, repoId: string) => {
      state.pinnedRepoIds = state.pinnedRepoIds.filter((id) => id !== repoId);
      if (state.selectedRepoId === repoId) state.selectedRepoId = null;
      if (state.selectedPrKey?.startsWith(`${repoId}#`)) state.selectedPrKey = null;
    };
    builder
      .addCase(loadSettings.fulfilled, (state, action) => hydrate(state, action.payload))
      .addCase(saveSettings.fulfilled, (state, action) => hydrate(state, action.payload))
      .addCase(togglePinnedRepoPersisted.pending, (state, action) =>
        flipPin(state, action.meta.arg),
      )
      .addCase(togglePinnedRepoPersisted.rejected, (state, action) =>
        flipPin(state, action.meta.arg),
      )
      .addCase(removeRepo.fulfilled, (state, action) => purgeRepo(state, action.payload))
      .addCase(deleteRepo.fulfilled, (state, action) => purgeRepo(state, action.payload));
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setSearchOpen,
  setActiveView,
  setSelectedRepo,
  setSelectedPr,
  setRepoFilterSort,
  toggleRepoStatusChip,
  bumpRefreshNonce,
  setImportDialogOpen,
  setFindDialogOpen,
  setUpdaterBanner,
  setUpdaterProgress,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
