import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type AppSettings,
  type AutoUpdateMode,
  type FontId,
  type FontSizeId,
  TauriCommand,
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
export const setFont = createAction<FontId>("settings/setFont");
export const setFontSize = createAction<FontSizeId>("settings/setFontSize");
export const setHighContrast = createAction<boolean>("settings/setHighContrast");
export const setReducedMotion = createAction<boolean>("settings/setReducedMotion");
export const setUnderlineLinks = createAction<boolean>("settings/setUnderlineLinks");
export const setLocale = createAction<string>("settings/setLocale");

export const setPollingIntervalMinutes = createAction<number>("settings/setPollingIntervalMinutes");

export const setDesktopAutoStart = createAction<boolean>("settings/setDesktopAutoStart");
export const setDesktopStartMinimized = createAction<boolean>("settings/setDesktopStartMinimized");
export const setDesktopCloseToTray = createAction<boolean>("settings/setDesktopCloseToTray");

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
