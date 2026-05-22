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

export interface UiState {
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  activeView: ActiveView;
  importDialogOpen: boolean;
  findDialogOpen: boolean;
  refreshNonce: number;
  updaterBanner: UpdaterBannerState | null;
  /** Repos the user has pinned. Hydrated from the Tauri backend's `pinnedRepoIds`
   *  field on `loadSettings.fulfilled`. */
  pinnedRepoIds: string[];
  /** Selected repo for the Repos detail pane / cross-page jumps. */
  selectedRepoId: string | null;
}
