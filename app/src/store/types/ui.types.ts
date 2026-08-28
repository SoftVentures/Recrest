import type { InstallChannel } from "@recrest/shared";

import type { SaveSeqTracked } from "@/store/reducers/saveSettingsSeq";

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
  /** How the running app was installed. `null` when the backend didn't say —
   *  the banner then shows no channel hint. */
  installChannel?: InstallChannel | null;
  downloadUrl: string | null;
}

export interface UiState extends SaveSeqTracked {
  /** Effective sidebar state — what the chrome renders. May be forced `true`
   *  by a narrow viewport regardless of {@link UiState.sidebarCollapsedPref}. */
  sidebarCollapsed: boolean;
  /** The user's own preference, as persisted in `windowState.sidebarCollapsed`.
   *  Kept apart from the effective value so a viewport-forced collapse can be
   *  released back to what the user actually chose. */
  sidebarCollapsedPref: boolean;
  /** True while `sidebarCollapsed` is a viewport-forced collapse rather than
   *  the user's choice. Never persisted, and settings hydration must not
   *  overwrite the effective value while it is set — otherwise a boot on a
   *  compact window expands the sidebar right back and
   *  `useResponsiveSidebar` has no viewport change left to react to. */
  sidebarAutoCollapsed: boolean;
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
