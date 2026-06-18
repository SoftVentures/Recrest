import { createReducer } from "@reduxjs/toolkit";

import {
  type AppSettings,
  DEFAULT_CODE_FONT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LIGATURE_MODE,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
} from "@recrest/shared";

import { StorageKey } from "@/lib/constants/storage.constants";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_THEME_ID,
  THEMES,
  type ThemeId,
} from "@/lib/constants/theme.constants";
import {
  deleteCustomFont,
  loadCustomFonts,
  loadDetectedIdes,
  loadDetectedShells,
  loadDetectedTerminals,
  loadDiscoveredIdes,
  loadDiscoveredTerminals,
  loadSettings,
  saveSettings,
  setCodeFont,
  setCodeLigatures,
  setCrashReporting,
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
  setDyslexiaFont,
  setFollowsSystem,
  setFont,
  setFontSize,
  setHighContrast,
  setLocale,
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
  setPollingIntervalMinutes,
  setPrimaryColor,
  setReducedMotion,
  setThemeId,
  setUnderlineLinks,
  setUpdateMode,
  syncSystemTheme,
  uploadCustomFont,
} from "@/store/actions/settings.actions";
import type { SettingsState } from "@/store/types/settings.types";

const POLLING_MIN_MIN = POLLING_INTERVAL_MIN_MS / 60_000;
const POLLING_MAX_MIN = POLLING_INTERVAL_MAX_MS / 60_000;
const DEFAULT_POLLING_MINUTES = 5;

function clampPolling(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_POLLING_MINUTES;
  return Math.min(POLLING_MAX_MIN, Math.max(POLLING_MIN_MIN, Math.round(raw)));
}

const KNOWN_THEME_IDS = new Set<ThemeId>(THEMES.map((t) => t.id));

function mapBackendTheme(theme: string | null | undefined): ThemeId {
  if (!theme) return DEFAULT_THEME_ID;
  if (KNOWN_THEME_IDS.has(theme as ThemeId)) return theme as ThemeId;
  if (theme === "system") {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return DEFAULT_THEME_ID;
  }
  return DEFAULT_THEME_ID;
}

/**
 * Resolve the boot-time theme synchronously from the same signals the
 * `index.html` anti-flash script uses. Keeps the reducer's initial render
 * aligned with what the inline script already painted on `<html>`, so the
 * first React render doesn't fight the pre-paint state.
 *
 * Order of preference matches the inline script in `index.html`:
 *   1. `recrest:theme-follows-system === "true"` → matchMedia
 *   2. valid `recrest:theme` slot → that
 *   3. matchMedia fallback (first run / SSR)
 */
function resolveBootTheme(): { themeId: ThemeId; followsSystem: boolean } {
  if (typeof window === "undefined") {
    return { themeId: DEFAULT_THEME_ID, followsSystem: true };
  }
  const matchesDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  let stored: string | null = null;
  let follows: string | null = null;
  try {
    stored = window.localStorage.getItem(StorageKey.THEME);
    follows = window.localStorage.getItem(StorageKey.THEME_FOLLOWS_SYSTEM);
  } catch {
    /* localStorage blocked — fall through to system */
  }
  if (follows === "true") {
    return { themeId: matchesDark ? "dark" : "light", followsSystem: true };
  }
  if (stored === "light" || stored === "dark" || stored === "oled" || stored === "glassy") {
    return { themeId: stored, followsSystem: false };
  }
  return { themeId: matchesDark ? "dark" : "light", followsSystem: true };
}

const BOOT_THEME = resolveBootTheme();

const initialState: SettingsState = {
  themeId: BOOT_THEME.themeId,
  // Resolved synchronously from localStorage + matchMedia to keep the first
  // React render aligned with the `index.html` anti-flash script. Without
  // this the reducer would start at "light" + followsSystem:true and flip a
  // tick later when the ThemeWrapper effect kicks in — that's the flash.
  followsSystem: BOOT_THEME.followsSystem,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  dyslexiaFont: false,
  font: DEFAULT_FONT,
  codeFont: DEFAULT_CODE_FONT,
  codeLigatures: DEFAULT_LIGATURE_MODE,
  fontSize: DEFAULT_FONT_SIZE,
  highContrast: false,
  reducedMotion: false,
  underlineLinks: false,
  locale: "en",
  pollingIntervalMinutes: DEFAULT_POLLING_MINUTES,
  desktop: {
    autoStart: false,
    startMinimized: false,
    closeToTray: true,
  },
  notifications: {
    enabled: false,
    newPr: true,
    ciFailed: true,
    mergeReady: true,
  },
  updates: {
    mode: "manual",
  },
  backend: null,
  detectedTerminals: null,
  detectedShells: null,
  detectedIdes: null,
  discoveredTerminals: null,
  discoveredIdes: null,
  customFonts: [],
  loading: false,
  error: null,
};

function applyBackend(state: SettingsState, payload: AppSettings | undefined) {
  if (!payload) return;
  state.backend = payload;
  // Phase 2: appearance + accessibility + windowState live on the backend, so
  // hydration is a straight copy. The legacy renderer-side localStorage layer
  // is gone — the backend is the only source of truth across sessions.
  //
  // We still defensively fall back to the legacy top-level `theme` field for
  // settings.json files written by older builds that haven't been migrated
  // yet (the Rust side `#[serde(default)]` fills the new substructs).
  const appearance = payload.appearance;
  if (appearance) {
    // When followsSystem is on, the persisted themeId is stale by definition —
    // it reflects whatever the OS was at last save, not what the OS is right
    // now. Re-derive from matchMedia so a boot under a flipped system theme
    // hydrates to the right colour without ThemeWrapper's effect having to
    // race against this `applyBackend` write. The Rust-side OS-truth read in
    // ThemeWrapper still corrects the WKWebView cold-start quirk afterwards.
    if (appearance.followsSystem) {
      const matchesDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      state.themeId = matchesDark ? "dark" : "light";
    } else {
      state.themeId = KNOWN_THEME_IDS.has(appearance.themeId as ThemeId)
        ? (appearance.themeId as ThemeId)
        : DEFAULT_THEME_ID;
    }
    state.followsSystem = appearance.followsSystem;
    state.primaryColor = appearance.primaryColor;
    state.font = appearance.font;
    // Old settings.json predating the code-font split won't carry `codeFont`.
    state.codeFont = appearance.codeFont ?? DEFAULT_CODE_FONT;
    state.codeLigatures = appearance.codeLigatures ?? DEFAULT_LIGATURE_MODE;
    state.fontSize = appearance.fontSize;
  } else {
    // Legacy fallback: old settings.json without `appearance` — derive from
    // the top-level `theme` slot like the pre-Phase-2 reducer did.
    state.themeId = mapBackendTheme(payload.theme);
    state.followsSystem = payload.theme === "system";
  }

  const accessibility = payload.accessibility;
  if (accessibility) {
    state.dyslexiaFont = accessibility.dyslexiaFont;
    state.highContrast = accessibility.highContrast;
    state.reducedMotion = accessibility.reducedMotion;
    state.underlineLinks = accessibility.underlineLinks;
    // Keep the `font` derivation consistent with `setDyslexiaFont` semantics:
    // dyslexiaFont === true ⇒ font slot should read "opendyslexic" regardless
    // of what the appearance block stored. Older backends only know the
    // legacy boolean; honour it.
    if (accessibility.dyslexiaFont) state.font = "opendyslexic";
  }

  if (payload.locale) state.locale = payload.locale;
  state.pollingIntervalMinutes = clampPolling(payload.pollingIntervalMs / 60_000);
  state.desktop.autoStart = payload.autoStart;
  state.desktop.startMinimized = payload.startMinimized;
  state.desktop.closeToTray = payload.closeToTray;
  state.notifications.enabled = payload.notifications.enabled;
  state.notifications.newPr = payload.notifications.newPr;
  state.notifications.ciFailed = payload.notifications.ciFailed;
  state.notifications.mergeReady = payload.notifications.mergeReady;
  state.updates.mode = payload.autoUpdate;
}

export const settingsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setThemeId, (state, action) => {
      state.themeId = action.payload;
      // Switching to a specific theme implicitly leaves "follow system" mode.
      state.followsSystem = false;
    })
    .addCase(syncSystemTheme, (state, action) => {
      // Internal OS-appearance update — keep followsSystem flag intact.
      state.themeId = action.payload;
    })
    .addCase(setFollowsSystem, (state, action) => {
      state.followsSystem = action.payload;
      if (action.payload) {
        // Resolve to the current OS preference immediately so the UI flips
        // without waiting for the next media-query change event.
        if (
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
          state.themeId = "dark";
        } else {
          state.themeId = "light";
        }
      }
    })
    .addCase(setPrimaryColor, (state, action) => {
      state.primaryColor = action.payload;
    })
    .addCase(setDyslexiaFont, (state, action) => {
      state.dyslexiaFont = action.payload;
      // Keep the new `font` slot in sync with the legacy boolean: flipping
      // the toggle should also switch the actual font family.
      state.font = action.payload ? "opendyslexic" : "inter";
    })
    .addCase(setFont, (state, action) => {
      state.font = action.payload;
      state.dyslexiaFont = action.payload === "opendyslexic";
    })
    .addCase(setCodeFont, (state, action) => {
      state.codeFont = action.payload;
    })
    .addCase(setCodeLigatures, (state, action) => {
      state.codeLigatures = action.payload;
    })
    .addCase(setFontSize, (state, action) => {
      state.fontSize = action.payload;
    })
    .addCase(setHighContrast, (state, action) => {
      state.highContrast = action.payload;
    })
    .addCase(setReducedMotion, (state, action) => {
      state.reducedMotion = action.payload;
    })
    .addCase(setUnderlineLinks, (state, action) => {
      state.underlineLinks = action.payload;
    })
    .addCase(setLocale, (state, action) => {
      state.locale = action.payload;
    })
    .addCase(setPollingIntervalMinutes, (state, action) => {
      state.pollingIntervalMinutes = clampPolling(action.payload);
    })
    .addCase(setDesktopAutoStart, (state, action) => {
      state.desktop.autoStart = action.payload;
    })
    .addCase(setDesktopStartMinimized, (state, action) => {
      state.desktop.startMinimized = action.payload;
    })
    .addCase(setDesktopCloseToTray, (state, action) => {
      state.desktop.closeToTray = action.payload;
    })
    .addCase(setCrashReporting, (state, action) => {
      if (state.backend) state.backend.crashReporting = action.payload;
    })
    .addCase(setNotificationsEnabled, (state, action) => {
      state.notifications.enabled = action.payload;
    })
    .addCase(setNotificationsNewPr, (state, action) => {
      state.notifications.newPr = action.payload;
    })
    .addCase(setNotificationsCiFailed, (state, action) => {
      state.notifications.ciFailed = action.payload;
    })
    .addCase(setNotificationsMergeReady, (state, action) => {
      state.notifications.mergeReady = action.payload;
    })
    .addCase(setUpdateMode, (state, action) => {
      state.updates.mode = action.payload;
    })
    .addCase(loadSettings.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(loadSettings.fulfilled, (state, action) => {
      state.loading = false;
      applyBackend(state, action.payload);
    })
    .addCase(loadSettings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? "load failed";
    })
    .addCase(saveSettings.fulfilled, (state, action) => {
      applyBackend(state, action.payload);
    })
    // Detection degrades silently to the stub maps on failure (no rejected
    // case + no error banner) — a missing probe must never block Settings.
    .addCase(loadDetectedTerminals.fulfilled, (state, action) => {
      state.detectedTerminals = action.payload;
    })
    .addCase(loadDetectedShells.fulfilled, (state, action) => {
      state.detectedShells = action.payload;
    })
    .addCase(loadDetectedIdes.fulfilled, (state, action) => {
      state.detectedIdes = action.payload;
    })
    .addCase(loadDiscoveredTerminals.fulfilled, (state, action) => {
      state.discoveredTerminals = action.payload;
    })
    .addCase(loadDiscoveredIdes.fulfilled, (state, action) => {
      state.discoveredIdes = action.payload;
    })
    .addCase(loadCustomFonts.fulfilled, (state, action) => {
      state.customFonts = action.payload;
    })
    .addCase(uploadCustomFont.fulfilled, (state, action) => {
      // Replace any same-family entry (re-upload) then append, keeping the
      // list sorted by family for a stable picker order.
      const next = state.customFonts.filter((f) => f.id !== action.payload.id);
      next.push(action.payload);
      next.sort((a, b) => a.family.toLowerCase().localeCompare(b.family.toLowerCase()));
      state.customFonts = next;
    })
    .addCase(deleteCustomFont.fulfilled, (state, action) => {
      state.customFonts = state.customFonts.filter((f) => f.id !== action.payload);
    });
});

export {
  loadSettings,
  saveSettings,
  setCrashReporting,
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
  setCodeFont,
  setDyslexiaFont,
  setFollowsSystem,
  setFont,
  setFontSize,
  setHighContrast,
  setLocale,
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
  setPollingIntervalMinutes,
  setPrimaryColor,
  setReducedMotion,
  setThemeId,
  setUnderlineLinks,
  setUpdateMode,
} from "@/store/actions/settings.actions";

export type { SettingsState } from "@/store/types/settings.types";
