import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

/**
 * Session-only developer flags. Registered conditionally in `store/index.ts`
 * behind `import.meta.env.DEV` so production bundles don't carry the reducer.
 *
 * These deliberately bypass `persistenceMiddleware` — toggling "force updater
 * fallback" or "ipc trace" should not survive a reload, which keeps the app
 * predictable after a forced refresh in the middle of a debugging session.
 */
export interface DevFlagsState {
  flags: Record<string, boolean | string>;
  ipcTrace: boolean;
  highlightMissingI18n: boolean;
  forceUpdaterFallback: boolean;
}

const initialState: DevFlagsState = {
  flags: {},
  ipcTrace: false,
  highlightMissingI18n: false,
  forceUpdaterFallback: false,
};

const slice = createSlice({
  name: "uiDevFlags",
  initialState,
  reducers: {
    setDevFlag(state, action: PayloadAction<{ name: string; value: boolean | string }>) {
      state.flags[action.payload.name] = action.payload.value;
    },
    clearDevFlag(state, action: PayloadAction<string>) {
      delete state.flags[action.payload];
    },
    resetDevFlags(state) {
      state.flags = {};
    },
    setIpcTrace(state, action: PayloadAction<boolean>) {
      state.ipcTrace = action.payload;
    },
    setHighlightMissingI18n(state, action: PayloadAction<boolean>) {
      state.highlightMissingI18n = action.payload;
    },
    setForceUpdaterFallback(state, action: PayloadAction<boolean>) {
      state.forceUpdaterFallback = action.payload;
    },
  },
});

export const {
  setDevFlag,
  clearDevFlag,
  resetDevFlags,
  setIpcTrace,
  setHighlightMissingI18n,
  setForceUpdaterFallback,
} = slice.actions;
export const uiDevFlagsReducer = slice.reducer;
