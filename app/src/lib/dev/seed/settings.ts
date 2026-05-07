import type { AppSettings } from "@recrest/shared";

/**
 * Dev-stub seed settings, mirrored from `tests/src/helpers/seed/settings.ts`.
 * Kept in sync by hand — there's no cross-workspace import so the app workspace
 * stays self-contained and `tsc -b` doesn't reach outside `app/src`.
 */
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
