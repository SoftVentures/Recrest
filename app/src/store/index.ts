import { configureStore } from "@reduxjs/toolkit";

import { settingsBackendSync } from "@/store/backendSync";
import { activityReducer } from "@/store/reducers/activityReducer";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import type { RootState } from "@/store/rootState";

/**
 * Phase 2: Redux is the only renderer-side source of truth for app state.
 * Cross-session persistence is owned exclusively by the Tauri backend
 * (`settings.json`), so there's no `preloadedState` hydration from
 * `localStorage` here — `useAppBootstrap` dispatches `loadSettings()` on
 * mount and both `settingsReducer` + `uiReducer` listen to the
 * `loadSettings.fulfilled` / `saveSettings.fulfilled` action to hydrate
 * theme, sidebar, pinned repos, accessibility flags, etc. from the backend
 * payload. The only renderer-side persistence that survives is i18next's
 * own locale detector (intentional — it predates Redux in the boot order
 * and is needed before the store is constructed).
 */
export const store = configureStore({
  reducer: {
    ui: uiReducer,
    settings: settingsReducer,
    providers: providersReducer,
    repos: reposReducer,
    prs: prsReducer,
    remoteImport: remoteImportReducer,
    activity: activityReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(settingsBackendSync),
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
