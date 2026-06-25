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
  refreshNonce: number;
  updaterBanner: UpdaterBannerState | null;
  /** Repos the user has pinned. Hydrated from the Tauri backend's `pinnedRepoIds`
   *  field on `loadSettings.fulfilled`. */
  pinnedRepoIds: string[];
  /** Selected repo for the Repos detail pane / cross-page jumps. */
  selectedRepoId: string | null;
  /** When true the onboarding wizard is shown regardless of the first-run
   *  heuristics. Set by the Settings/Developer "Open onboarding wizard"
   *  affordance and cleared when the wizard finishes. Lives in Redux so the
   *  wizard re-renders instantly without a page reload. */
  onboardingOverride: boolean;
}
