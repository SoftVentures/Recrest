import { createReducer } from "@reduxjs/toolkit";

import {
  resetAllShortcuts,
  resetShortcut,
  setShortcutOverride,
} from "@/store/actions/shortcuts.actions";
import { loadPersistedOverrides } from "@/store/shortcutsPersistence";
import type { ShortcutsState } from "@/store/types/shortcuts.types";

export const initialShortcutsState: ShortcutsState = {
  overrides: loadPersistedOverrides(),
};

export const shortcutsReducer = createReducer(initialShortcutsState, (builder) => {
  builder
    .addCase(setShortcutOverride, (state, action) => {
      state.overrides[action.payload.id] = action.payload.combo;
    })
    .addCase(resetShortcut, (state, action) => {
      delete state.overrides[action.payload];
    })
    .addCase(resetAllShortcuts, (state) => {
      state.overrides = {};
    });
});

export {
  resetAllShortcuts,
  resetShortcut,
  setShortcutOverride,
} from "@/store/actions/shortcuts.actions";
export type { ShortcutsState } from "@/store/types/shortcuts.types";
