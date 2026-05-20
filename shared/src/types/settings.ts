export type ThemeMode = "light" | "dark" | "system";

export type AutoUpdateMode = "auto" | "manual" | "off";

export interface NotificationSettings {
  enabled: boolean;
  newPr: boolean;
  ciFailed: boolean;
  mergeReady: boolean;
}

export interface PrivacySettings {
  fetchFavicons: boolean;
}

export interface RepoImportDefaults {
  groupId: string | null;
  providerId: string | null;
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
  commitMessageTemplate: string;
  privacy: PrivacySettings;
}

export interface RepoSettings {
  id: string;
  defaultIde: string | null;
  pinned: boolean;
}
