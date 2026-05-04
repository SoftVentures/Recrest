import type { AppSettings } from "@recrest/shared";

export const SEED_SETTINGS: AppSettings = {
  pollingIntervalMs: 30_000,
  defaultIde: "vscode",
  theme: "system",
  locale: "en",
  scanPaths: ["~/Code"],
  autoStart: false,
  autoUpdate: "auto",
  startMinimized: false,
  closeToTray: true,
  notifications: {
    enabled: true,
    newPr: true,
    ciFailed: true,
    mergeReady: true,
  },
  crashReporting: false,
  // Phase 0.1 additive defaults — keep aligned with `app/src/store/index.ts`.
  pinnedRepoIds: [],
  authorAliases: {},
  uiScale: 1.0,
  repoListViewMode: "grouped",
  repoListSort: { field: "", direction: "asc" },
  repoImportDefaults: { groupId: null, providerId: null },
  defaultScanPath: null,
  terminal: { id: null, profile: null, customCommand: null },
  commitMessageTemplate: "{{author}}: {{date}}",
  privacy: { fetchFavicons: false },
};

export const SEED_SETTINGS_DARK: AppSettings = {
  ...SEED_SETTINGS,
  theme: "dark",
};

export const SEED_SETTINGS_DE: AppSettings = {
  ...SEED_SETTINGS,
  locale: "de",
};
