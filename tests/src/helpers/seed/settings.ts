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
  closeToTray: false,
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
  shell: null,
  commitMessageTemplate: "{{author}}: {{date}}",
  privacy: { fetchFavicons: false },
  defaultSshKeyPath: null,
  gitConfigOverride: { userName: null, userEmail: null },
  appearance: {
    themeId: "light",
    followsSystem: true,
    primaryColor: "default",
    font: "inter",
    codeFont: "jetbrains-mono",
    codeLigatures: "standard",
    fontSize: "md",
    translucency: { enabled: false, intensity: 50, blurIntensity: 30 },
    localePrefs: {
      dateFormat: "relative",
      timeFormat: "24h",
      weekStart: "monday",
      region: null,
      timeZone: null,
    },
  },
  accessibility: {
    dyslexiaFont: false,
    highContrast: false,
    reducedMotion: false,
    underlineLinks: false,
  },
  windowState: {
    sidebarCollapsed: false,
  },
};

export const SEED_SETTINGS_DARK: AppSettings = {
  ...SEED_SETTINGS,
  theme: "dark",
  // Phase 2 moved the effective theme onto `appearance` (themeId + followsSystem);
  // flipping the legacy `theme` field alone no longer drives the boot theme, so
  // keep the dark seed internally consistent or a "seeded dark" boot renders light.
  appearance: { ...SEED_SETTINGS.appearance, themeId: "dark", followsSystem: false },
};

export const SEED_SETTINGS_DE: AppSettings = {
  ...SEED_SETTINGS,
  locale: "de",
};
