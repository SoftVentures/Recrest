import { configureStore } from "@reduxjs/toolkit";

import {
  DEFAULT_ACCENT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  POLLING_INTERVAL_DEFAULT_MS,
} from "@recrest/shared";

import { loadPersisted, persistenceMiddleware } from "@/store/persistence";
import { providersReducer } from "@/store/slices/providersSlice";
import { prsReducer } from "@/store/slices/prsSlice";
import { remoteImportReducer } from "@/store/slices/remoteImportSlice";
import { reposReducer } from "@/store/slices/reposSlice";
import type { SettingsState } from "@/store/slices/settingsSlice";
import { settingsReducer } from "@/store/slices/settingsSlice";
import { uiReducer } from "@/store/slices/uiSlice";

const persisted = loadPersisted();

export const store = configureStore({
  reducer: {
    repos: reposReducer,
    prs: prsReducer,
    providers: providersReducer,
    remoteImport: remoteImportReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  preloadedState: persisted
    ? {
        ui: {
          sidebarCollapsed: persisted.sidebarCollapsed ?? false,
          searchOpen: false,
          activeView: "dashboard" as const,
          selectedRepoId: null,
          pinnedRepoIds: [],
          refreshNonce: 0,
          importDialogOpen: false,
          findDialogOpen: false,
          updaterBanner: null,
        },
        settings: {
          pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
          defaultIde: null,
          theme: persisted.theme ?? "system",
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
          accent: persisted.accent ?? DEFAULT_ACCENT,
          font: persisted.font ?? DEFAULT_FONT,
          fontSize: persisted.fontSize ?? DEFAULT_FONT_SIZE,
          highContrast: persisted.highContrast ?? false,
          reducedMotion: persisted.reducedMotion ?? false,
          underlineLinks: persisted.underlineLinks ?? false,
          loading: false,
          error: null,
          detectedIdes: [],
        } satisfies SettingsState,
      }
    : undefined,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
