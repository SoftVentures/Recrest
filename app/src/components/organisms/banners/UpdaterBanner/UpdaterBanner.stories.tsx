import { Provider as ReduxProvider } from "react-redux";

import { configureStore } from "@reduxjs/toolkit";

import type { Meta, StoryObj } from "@storybook/react-vite";

import UpdaterBanner from "@/components/organisms/banners/UpdaterBanner";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";

const storeWithBanner = configureStore({
  reducer: { ui: uiReducer, settings: settingsReducer },
  preloadedState: {
    ui: {
      sidebarCollapsed: false,
      searchOpen: false,
      importDialogOpen: false,
      refreshNonce: 0,
      updaterBanner: { version: "1.4.0", currentVersion: "1.3.2", canAutoInstall: true },
    } as never,
  },
});

const meta = {
  title: "Organisms/Banners/UpdaterBanner",
  component: UpdaterBanner,
  decorators: [
    (Story) => (
      <ReduxProvider store={storeWithBanner}>
        <Story />
      </ReduxProvider>
    ),
  ],
} satisfies Meta<typeof UpdaterBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AutoInstall: Story = {};
