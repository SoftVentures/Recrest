import { Provider as ReduxProvider } from "react-redux";

import { MemoryRouter } from "react-router-dom";

import { I18nextProvider } from "react-i18next";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { type Store, configureStore } from "@reduxjs/toolkit";

import { type RenderResult, render } from "@testing-library/react";

import { type ThemeId } from "@/lib/constants/theme.constants";
import i18n from "@/locales";
import type { RootState } from "@/store";
import { activityReducer } from "@/store/reducers/activityReducer";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import { getTheme } from "@/theme";

const testReducer = {
  ui: uiReducer,
  settings: settingsReducer,
  providers: providersReducer,
  repos: reposReducer,
  prs: prsReducer,
  remoteImport: remoteImportReducer,
  activity: activityReducer,
};

type PreloadedSlices = { [K in keyof RootState]?: Partial<RootState[K]> };

/**
 * Build an isolated store, optionally overriding individual slice fields.
 * Each provided slice is shallow-merged onto that slice's real initial state,
 * so a test can set e.g. `{ settings: { backend } }` without reconstructing
 * the whole tree.
 */
export function makeTestStore(preloaded?: PreloadedSlices) {
  const base = configureStore({ reducer: testReducer });
  if (!preloaded) return base;
  const baseState = base.getState();
  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(baseState) as (keyof RootState)[]) {
    merged[key] = { ...baseState[key], ...(preloaded[key] ?? {}) };
  }
  return configureStore({ reducer: testReducer, preloadedState: merged as unknown as RootState });
}

/**
 * Render a component wrapped in the MUI theme + CssBaseline. Use for atom
 * and molecule tests that don't touch Redux, i18n, or routing.
 */
export function renderWithTheme(ui: React.ReactElement, opts?: { themeId?: ThemeId }) {
  const theme = getTheme(opts?.themeId ?? "light");
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>,
  );
}

/**
 * Render with the full provider stack (Redux + i18n + Theme + Router).
 * Use for feature-level component tests or hook tests that need real
 * dispatch + selectors. Builds a fresh isolated store per call to keep
 * tests independent.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  opts?: { themeId?: ThemeId; route?: string; store?: Store<RootState> },
): RenderResult & { store: Store<RootState> } {
  const store = opts?.store ?? makeTestStore();
  const theme = getTheme(opts?.themeId ?? "light");
  const result = render(
    <ReduxProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MemoryRouter initialEntries={[opts?.route ?? "/"]}>
            {ui}
          </MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </ReduxProvider>,
  );
  return { store, ...result };
}
