import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  type AccentId,
  type AppSettings,
  DEFAULT_ACCENT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  type FontId,
  type FontSizeId,
  POLLING_INTERVAL_DEFAULT_MS,
  TauriCommand,
  type ThemeMode,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";

/** Frontend-only appearance prefs — persisted via localStorage, not Rust.
 *  These shape the visual style; the backend doesn't need to know about them. */
export interface AppearancePrefs {
  accent: AccentId;
  font: FontId;
  fontSize: FontSizeId;
  highContrast: boolean;
  reducedMotion: boolean;
  underlineLinks: boolean;
}

export interface SettingsState extends AppSettings, AppearancePrefs {
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
  defaultIde: null,
  theme: "system",
  locale: "en",
  scanPaths: [],
  autoStart: false,
  autoUpdate: "manual",
  startMinimized: false,
  closeToTray: true,
  notifications: {
    enabled: false,
    newPr: true,
    ciFailed: true,
    mergeReady: true,
  },
  crashReporting: false,
  accent: DEFAULT_ACCENT,
  font: DEFAULT_FONT,
  fontSize: DEFAULT_FONT_SIZE,
  highContrast: false,
  reducedMotion: false,
  underlineLinks: false,
  loading: false,
  error: null,
};

export const loadSettings = createAsyncThunk<AppSettings>("settings/load", async () =>
  invoke<AppSettings>(TauriCommand.GET_SETTINGS),
);

export const saveSettings = createAsyncThunk<AppSettings, Partial<AppSettings>>(
  "settings/save",
  async (patch) => invoke<AppSettings>(TauriCommand.UPDATE_SETTINGS, { patch }),
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setLocale(state, action: PayloadAction<string>) {
      state.locale = action.payload;
    },
    setAccent(state, action: PayloadAction<AccentId>) {
      state.accent = action.payload;
    },
    setFont(state, action: PayloadAction<FontId>) {
      state.font = action.payload;
    },
    setFontSize(state, action: PayloadAction<FontSizeId>) {
      state.fontSize = action.payload;
    },
    setHighContrast(state, action: PayloadAction<boolean>) {
      state.highContrast = action.payload;
    },
    setReducedMotion(state, action: PayloadAction<boolean>) {
      state.reducedMotion = action.payload;
    },
    setUnderlineLinks(state, action: PayloadAction<boolean>) {
      state.underlineLinks = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      });
  },
});

export const {
  setTheme,
  setLocale,
  setAccent,
  setFont,
  setFontSize,
  setHighContrast,
  setReducedMotion,
  setUnderlineLinks,
} = settingsSlice.actions;
export const settingsReducer = settingsSlice.reducer;
