import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { type AppSettings, POLLING_INTERVAL_DEFAULT_MS, type ThemeMode } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export interface SettingsState extends AppSettings {
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
  defaultIde: null,
  theme: "system",
  locale: "en",
  scanPaths: [],
  loading: false,
  error: null,
};

export const loadSettings = createAsyncThunk<AppSettings>("settings/load", async () =>
  invoke<AppSettings>("get_settings"),
);

export const saveSettings = createAsyncThunk<AppSettings, Partial<AppSettings>>(
  "settings/save",
  async (patch) => invoke<AppSettings>("update_settings", { patch }),
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

export const { setTheme, setLocale } = settingsSlice.actions;
export const settingsReducer = settingsSlice.reducer;
