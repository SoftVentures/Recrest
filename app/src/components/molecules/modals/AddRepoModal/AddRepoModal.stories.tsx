import { Provider as ReduxProvider } from "react-redux";

import { MemoryRouter } from "react-router-dom";

import { I18nextProvider } from "react-i18next";

import { configureStore } from "@reduxjs/toolkit";

import type { Meta, StoryObj } from "@storybook/react-vite";

import AddRepoModal from "@/components/molecules/modals/AddRepoModal";
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
  preloadedState: {
    ui: { sidebarCollapsed: false, importDialogOpen: true } as never,
  },
});

const meta = {
  title: "Molecules/Modals/AddRepoModal",
  component: AddRepoModal,
  decorators: [
    (Story) => (
      <ReduxProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </I18nextProvider>
      </ReduxProvider>
    ),
  ],
} satisfies Meta<typeof AddRepoModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
