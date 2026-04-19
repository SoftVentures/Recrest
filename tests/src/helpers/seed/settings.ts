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
};

export const SEED_SETTINGS_DARK: AppSettings = {
  ...SEED_SETTINGS,
  theme: "dark",
};

export const SEED_SETTINGS_DE: AppSettings = {
  ...SEED_SETTINGS,
  locale: "de",
};
