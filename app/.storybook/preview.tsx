import { Provider as ReduxProvider } from "react-redux";

import { MemoryRouter } from "react-router-dom";

import { I18nextProvider } from "react-i18next";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { configureStore } from "@reduxjs/toolkit";
import type { Preview } from "@storybook/react-vite";

import { THEMES, type ThemeId } from "@/lib/constants/theme.constants";
import i18n from "@/locales";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import { getTheme } from "@/theme";

const store = configureStore({
  reducer: {
    ui: uiReducer,
    settings: settingsReducer,
    providers: providersReducer,
    repos: reposReducer,
    prs: prsReducer,
    remoteImport: remoteImportReducer,
  },
});

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    layout: "centered",
  },
  globalTypes: {
    themeId: {
      description: "App theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: THEMES.map((t) => ({ value: t.id, title: t.label })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const themeId = (ctx.globals.themeId ?? "light") as ThemeId;
      const theme = getTheme(themeId);
      return (
        <ReduxProvider store={store}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider theme={theme}>
              <CssBaseline enableColorScheme />
              <MemoryRouter
                future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
              >
                <Story />
              </MemoryRouter>
            </ThemeProvider>
          </I18nextProvider>
        </ReduxProvider>
      );
    },
  ],
};

export default preview;
