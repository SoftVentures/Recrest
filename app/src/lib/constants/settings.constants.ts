export const SettingsTab = {
  GENERAL: "general",
  ACCOUNTS: "accounts",
  INTEGRATIONS: "integrations",
  GIT: "git",
  SHORTCUTS: "shortcuts",
  STORAGE: "storage",
  ABOUT: "about",
  DEVELOPER: "developer",
} as const;

export type SettingsTabId = (typeof SettingsTab)[keyof typeof SettingsTab];

export const SETTINGS_TAB_QUERY_PARAM = "tab";
