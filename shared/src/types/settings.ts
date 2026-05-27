import type { FontId, FontSizeId } from "../constants/ui.js";

export type ThemeMode = "light" | "dark" | "system";

/** Renderer-side theme variant — includes `oled` and `glassy` on top of the
 *  legacy `ThemeMode` (which only spans light/dark/system). Lives on
 *  `appearance.themeId` so the backend can persist the user's last pick.
 *
 *  Kept as a plain string union here (the richer `ThemeId` constant union
 *  lives in `@/lib/constants/theme.constants` on the renderer side, and is
 *  a strict subset of this one). */
export type ThemeIdValue = "light" | "dark" | "oled" | "glassy";

/** Accent color scheme — must match the keys of `PRIMARY_COLOR_SCHEMES`
 *  in `app/src/lib/constants/theme.constants.ts`. */
export type PrimaryColorScheme = "default" | "blue" | "green" | "purple" | "pink" | "amber";

export const AutoUpdateMode = {
  AUTO: "auto",
  MANUAL: "manual",
  OFF: "off",
} as const;
export type AutoUpdateMode = (typeof AutoUpdateMode)[keyof typeof AutoUpdateMode];

export interface NotificationSettings {
  enabled: boolean;
  newPr: boolean;
  ciFailed: boolean;
  mergeReady: boolean;
}

/** Renderer-scoped appearance tokens, persisted via the Tauri backend so
 *  every Recrest surface reads them from a single source of truth. */
export interface AppearanceSettings {
  themeId: ThemeIdValue;
  /** True ⇔ track `prefers-color-scheme`. When false, `themeId` is the
   *  user's explicit pick and the OS toggle is ignored. */
  followsSystem: boolean;
  primaryColor: PrimaryColorScheme;
  font: FontId;
  fontSize: FontSizeId;
}

export interface AccessibilitySettings {
  dyslexiaFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  underlineLinks: boolean;
}

export interface WindowStateSettings {
  sidebarCollapsed: boolean;
}

export interface PrivacySettings {
  fetchFavicons: boolean;
}

export interface SshKeyInfo {
  path: string;
  name: string;
  hasPublic: boolean;
}

export interface SshKeyListing {
  dir: string | null;
  keys: SshKeyInfo[];
}

export interface RepoImportDefaults {
  groupId: string | null;
  providerId: string | null;
}

export interface GitConfigOverride {
  userName: string | null;
  userEmail: string | null;
}

export interface TerminalSettings {
  id: string | null;
  profile: string | null;
  customCommand: string | null;
}

export type RepoListViewMode = "grouped" | "flat" | "card";

export type SortDirection = "asc" | "desc";

export interface RepoListSort {
  field: string;
  direction: SortDirection;
}

export interface AppSettings {
  pollingIntervalMs: number;
  defaultIde: string | null;
  theme: ThemeMode;
  locale: string;
  scanPaths: string[];
  autoStart: boolean;
  autoUpdate: AutoUpdateMode;
  startMinimized: boolean;
  closeToTray: boolean;
  notifications: NotificationSettings;
  crashReporting: boolean;

  // ---- Phase 0.1 additive fields ----
  pinnedRepoIds: string[];
  /** Manual author merges keyed by `signatureKey` (see Plan 1 §A.4). */
  authorAliases: Record<string, string>;
  uiScale: number;
  repoListViewMode: RepoListViewMode;
  repoListSort: RepoListSort;
  repoImportDefaults: RepoImportDefaults;
  defaultScanPath: string | null;
  terminal: TerminalSettings;
  /** Preferred shell id (e.g. `zsh`, `fish`) or null for auto. */
  shell: string | null;
  commitMessageTemplate: string;
  privacy: PrivacySettings;
  /** Global default SSH private key path for all SSH remotes. A repo's own
   *  `sshKeyPath` overrides it; otherwise it's tried before ssh-agent. */
  defaultSshKeyPath: string | null;
  gitConfigOverride: GitConfigOverride;

  // ---- Phase 2: renderer-scoped preferences moved off localStorage ----
  appearance: AppearanceSettings;
  accessibility: AccessibilitySettings;
  windowState: WindowStateSettings;
}

export interface RepoSettings {
  id: string;
  defaultIde: string | null;
  pinned: boolean;
}
