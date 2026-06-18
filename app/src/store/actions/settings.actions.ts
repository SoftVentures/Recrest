import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type AppSettings,
  type AutoUpdateMode,
  type CustomFont,
  type DiscoveredApp,
  type FontSelection,
  type FontSizeId,
  type LigatureMode,
  type ShellDetection,
  TauriCommand,
  type TerminalDetection,
} from "@recrest/shared";

import type { PrimaryColorScheme, ThemeId } from "@/lib/constants/theme.constants";
import { invoke } from "@/lib/tauri";

export const setThemeId = createAction<ThemeId>("settings/setThemeId");
/** Opt in to follow `prefers-color-scheme`. Effective `themeId` is recalculated
 *  whenever the OS media query changes. */
export const setFollowsSystem = createAction<boolean>("settings/setFollowsSystem");
/**
 * Atomic "the OS appearance just flipped" sync — updates `themeId` to the
 * supplied value WITHOUT clearing `followsSystem`. Distinct from `setThemeId`
 * (which is the user explicitly picking a theme and thus implicitly leaves
 * follow-system mode). Internal: only the matchMedia listener in
 * `ThemeWrapper` dispatches this.
 */
export const syncSystemTheme = createAction<ThemeId>("settings/syncSystemTheme");
export const setPrimaryColor = createAction<PrimaryColorScheme>("settings/setPrimaryColor");
export const setDyslexiaFont = createAction<boolean>("settings/setDyslexiaFont");
export const setFont = createAction<FontSelection>("settings/setFont");
export const setCodeFont = createAction<FontSelection>("settings/setCodeFont");
export const setCodeLigatures = createAction<LigatureMode>("settings/setCodeLigatures");
export const setFontSize = createAction<FontSizeId>("settings/setFontSize");
export const setHighContrast = createAction<boolean>("settings/setHighContrast");
export const setReducedMotion = createAction<boolean>("settings/setReducedMotion");
export const setUnderlineLinks = createAction<boolean>("settings/setUnderlineLinks");
export const setLocale = createAction<string>("settings/setLocale");

export const setPollingIntervalMinutes = createAction<number>("settings/setPollingIntervalMinutes");

export const setDesktopAutoStart = createAction<boolean>("settings/setDesktopAutoStart");
export const setDesktopStartMinimized = createAction<boolean>("settings/setDesktopStartMinimized");
export const setDesktopCloseToTray = createAction<boolean>("settings/setDesktopCloseToTray");
export const setCrashReporting = createAction<boolean>("settings/setCrashReporting");

export const setNotificationsEnabled = createAction<boolean>("settings/setNotificationsEnabled");
export const setNotificationsNewPr = createAction<boolean>("settings/setNotificationsNewPr");
export const setNotificationsCiFailed = createAction<boolean>("settings/setNotificationsCiFailed");
export const setNotificationsMergeReady = createAction<boolean>(
  "settings/setNotificationsMergeReady",
);

export const setUpdateMode = createAction<AutoUpdateMode>("settings/setUpdateMode");

export const loadSettings = createAsyncThunk<AppSettings>("settings/load", async () =>
  invoke<AppSettings>(TauriCommand.GET_SETTINGS),
);

export const saveSettings = createAsyncThunk<AppSettings, Partial<AppSettings>>(
  "settings/save",
  async (patch) => invoke<AppSettings>(TauriCommand.UPDATE_SETTINGS, { patch }),
);

export const loadDetectedTerminals = createAsyncThunk<TerminalDetection[]>(
  "settings/detectTerminals",
  async () => invoke<TerminalDetection[]>(TauriCommand.DETECT_TERMINALS),
);

export const loadDetectedShells = createAsyncThunk<ShellDetection[]>(
  "settings/detectShells",
  async () => invoke<ShellDetection[]>(TauriCommand.DETECT_SHELLS),
);

export const loadDetectedIdes = createAsyncThunk<string[]>("settings/detectIdes", async () =>
  invoke<string[]>(TauriCommand.DETECT_IDES),
);

/** Bundle/registry/.desktop-based discovery — returns real installed apps with
 *  human display names. Augments the older PATH-based `loadDetectedTerminals`
 *  probe; the picker prefers this when available and falls back otherwise. */
export const loadDiscoveredTerminals = createAsyncThunk<DiscoveredApp[]>(
  "settings/discoverTerminals",
  async () => invoke<DiscoveredApp[]>(TauriCommand.LIST_TERMINALS),
);

export const loadDiscoveredIdes = createAsyncThunk<DiscoveredApp[]>(
  "settings/discoverIdes",
  async () => invoke<DiscoveredApp[]>(TauriCommand.LIST_IDES),
);

export const loadCustomFonts = createAsyncThunk<CustomFont[]>(
  "settings/loadCustomFonts",
  async () => invoke<CustomFont[]>(TauriCommand.LIST_CUSTOM_FONTS),
);

export const uploadCustomFont = createAsyncThunk<CustomFont, string>(
  "settings/uploadCustomFont",
  async (sourcePath) => invoke<CustomFont>(TauriCommand.UPLOAD_FONT, { sourcePath }),
);

/** Deletes an uploaded font by id; resolves with that id so the reducer can
 *  drop it from the list without a refetch. */
export const deleteCustomFont = createAsyncThunk<string, string>(
  "settings/deleteCustomFont",
  async (id) => {
    await invoke<void>(TauriCommand.DELETE_CUSTOM_FONT, { id });
    return id;
  },
);
