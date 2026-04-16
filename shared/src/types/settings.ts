export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  pollingIntervalMs: number;
  defaultIde: string | null;
  theme: ThemeMode;
  locale: string;
  scanPaths: string[];
}

export interface RepoSettings {
  id: string;
  defaultIde: string | null;
  pinned: boolean;
}
