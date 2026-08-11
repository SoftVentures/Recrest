import type { AppSettings } from "@recrest/shared";

/**
 * A complete `AppSettings` snapshot, as `get_settings` / `update_settings`
 * return one.
 *
 * Shared because `settingsReducer.applyBackend` dereferences several nested
 * blocks unconditionally (`payload.notifications.enabled`, …), so any test that
 * dispatches `loadSettings.fulfilled` / `saveSettings.fulfilled` through a real
 * store needs the whole shape, not a partial cast.
 */
export function makeAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pollingIntervalMs: 5 * 60_000,
    defaultIde: null,
    theme: "light",
    locale: "en",
    scanPaths: [],
    autoStart: false,
    autoUpdate: "manual",
    startMinimized: false,
    closeToTray: true,
    notifications: { enabled: false, newPr: true, ciFailed: true, mergeReady: true },
    crashReporting: false,
    pinnedRepoIds: [],
    authorAliases: {},
    uiScale: 1,
    repoListViewMode: "grouped",
    repoListSort: { field: "name", direction: "asc" },
    repoImportDefaults: { groupId: null, providerId: null },
    defaultScanPath: null,
    terminal: { id: null, profile: null, customCommand: null },
    shell: null,
    commitMessageTemplate: "",
    privacy: { fetchFavicons: true },
    defaultSshKeyPath: null,
    gitConfigOverride: { userName: null, userEmail: null },
    appearance: {
      themeId: "dark",
      followsSystem: false,
      primaryColor: "blue",
      font: "inter",
      codeFont: "fira-code",
      codeLigatures: "stylistic",
      fontSize: "md",
      translucency: { enabled: true, intensity: 30, blurIntensity: 30 },
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
    windowState: { sidebarCollapsed: false },
    ...overrides,
  };
}

/** Same snapshot with only the translucency intensity varied — the slider drag
 *  is the canonical out-of-order `update_settings` scenario. */
export function appSettingsWithIntensity(intensity: number): AppSettings {
  const base = makeAppSettings();
  return {
    ...base,
    appearance: {
      ...base.appearance,
      translucency: { ...base.appearance.translucency, intensity },
    },
  };
}
