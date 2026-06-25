import { configureStore } from "@reduxjs/toolkit";

import {
  activityRangePersistMiddleware,
  loadPersistedRange,
} from "@/store/activityRangePersistence";
import { settingsBackendSync } from "@/store/backendSync";
import { activityReducer, initialActivityState } from "@/store/reducers/activityReducer";
import { branchesReducer } from "@/store/reducers/branchesReducer";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { shortcutsReducer } from "@/store/reducers/shortcutsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import type { RootState } from "@/store/rootState";
import { shortcutsPersistMiddleware } from "@/store/shortcutsPersistence";

/**
 * Phase 2: Redux is the only renderer-side source of truth for app state.
 * Cross-session persistence is owned exclusively by the Tauri backend
 * (`settings.json`), so there's no `preloadedState` hydration from
 * `localStorage` here — `useAppBootstrap` dispatches `loadSettings()` on
 * mount and both `settingsReducer` + `uiReducer` listen to the
 * `loadSettings.fulfilled` / `saveSettings.fulfilled` action to hydrate
 * theme, sidebar, pinned repos, accessibility flags, etc. from the backend
 * payload. The renderer-side persistence that survives is intentional and
 * narrow: i18next's own locale detector (predates Redux in the boot order),
 * and the global activity time-range (`activity.selectedRange`) — both are
 * pure renderer UI preferences that must be available *synchronously* at store
 * construction, before the async backend `loadSettings` resolves, to avoid a
 * flash of the default value. The range is hydrated from `localStorage` here
 * and mirrored back by `activityRangePersistMiddleware`.
 */
const persistedRange = loadPersistedRange();

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    settings: settingsReducer,
    providers: providersReducer,
    repos: reposReducer,
    prs: prsReducer,
    remoteImport: remoteImportReducer,
    activity: activityReducer,
    branches: branchesReducer,
    shortcuts: shortcutsReducer,
  },
  preloadedState: persistedRange
    ? { activity: { ...initialActivityState, selectedRange: persistedRange } }
    : undefined,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      settingsBackendSync,
      activityRangePersistMiddleware,
      shortcutsPersistMiddleware,
    ),
});

export type { RootState };
export type AppDispatch = typeof store.dispatch;

// Compile-time guarantee that the hand-written `RootState` (store/rootState.ts)
// stays in lockstep with the real store shape. Passing the real state to a
// `RootState`-typed parameter fails to type-check if the reducer map above
// adds, removes, or retypes a slice without `store/rootState.ts` following —
// `tsc` then errors right here instead of letting the two drift apart.
function assertRootStateShape(_state: RootState): void {}
assertRootStateShape(store.getState());
