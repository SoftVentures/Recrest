import { configureStore } from "@reduxjs/toolkit";

import { POLLING_INTERVAL_DEFAULT_MS } from "@recrest/shared";

import { loadPersisted, persistenceMiddleware } from "@/store/persistence";
import { providersReducer } from "@/store/slices/providersSlice";
import { prsReducer } from "@/store/slices/prsSlice";
import { reposReducer } from "@/store/slices/reposSlice";
import { settingsReducer } from "@/store/slices/settingsSlice";
import { uiReducer } from "@/store/slices/uiSlice";

const persisted = loadPersisted();

export const store = configureStore({
  reducer: {
    repos: reposReducer,
    prs: prsReducer,
    providers: providersReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  preloadedState: persisted
    ? {
        ui: {
          sidebarCollapsed: persisted.sidebarCollapsed ?? false,
          searchOpen: false,
          activeView: "repos" as const,
          selectedRepoId: null,
        },
        settings: {
          pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
          defaultIde: null,
          theme: persisted.theme ?? "system",
          locale: "en",
          scanPaths: [],
          loading: false,
          error: null,
        },
      }
    : undefined,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
