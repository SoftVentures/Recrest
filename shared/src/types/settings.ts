export type ThemeMode = "light" | "dark" | "system";

export type AutoUpdateMode = "auto" | "manual" | "off";

export interface NotificationSettings {
  enabled: boolean;
  newPr: boolean;
  ciFailed: boolean;
  mergeReady: boolean;
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
}

export interface RepoSettings {
  id: string;
  defaultIde: string | null;
  pinned: boolean;
}
