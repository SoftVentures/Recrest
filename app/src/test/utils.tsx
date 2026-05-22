import { Provider as ReduxProvider } from "react-redux";

import { MemoryRouter } from "react-router-dom";

import { I18nextProvider } from "react-i18next";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { configureStore } from "@reduxjs/toolkit";

import { render } from "@testing-library/react";

import { type ThemeId } from "@/lib/constants/theme.constants";
import i18n from "@/locales";
import { providersReducer } from "@/store/reducers/providersReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import { getTheme } from "@/theme";

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
  opts?: { themeId?: ThemeId; route?: string },
) {
  const store = configureStore({
    reducer: { ui: uiReducer, settings: settingsReducer, providers: providersReducer },
  });
  const theme = getTheme(opts?.themeId ?? "light");
  return render(
    <ReduxProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MemoryRouter initialEntries={[opts?.route ?? "/"]}>{ui}</MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </ReduxProvider>,
  );
}
