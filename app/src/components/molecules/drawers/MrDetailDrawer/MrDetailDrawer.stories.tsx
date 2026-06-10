import { Provider as ReduxProvider } from "react-redux";

import { MemoryRouter } from "react-router-dom";

import { I18nextProvider } from "react-i18next";

import { configureStore } from "@reduxjs/toolkit";

import type { Meta, StoryObj } from "@storybook/react-vite";

import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import i18n from "@/locales";
import { providersReducer } from "@/store/reducers/providersReducer";
import { prsReducer } from "@/store/reducers/prsReducer";
import { remoteImportReducer } from "@/store/reducers/remoteImportReducer";
import { reposReducer } from "@/store/reducers/reposReducer";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";

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

const meta = {
  title: "Molecules/Drawers/MrDetailDrawer",
  component: MrDetailDrawer,
  decorators: [
    (Story) => (
      <ReduxProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Story />
          </MemoryRouter>
        </I18nextProvider>
      </ReduxProvider>
    ),
  ],
} satisfies Meta<typeof MrDetailDrawer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { pr: null, repoId: "demo", onClose: () => {} },
};
