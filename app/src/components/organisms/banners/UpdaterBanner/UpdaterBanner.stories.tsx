import { Provider as ReduxProvider } from "react-redux";

import { configureStore } from "@reduxjs/toolkit";

import type { Meta, StoryObj } from "@storybook/react-vite";

import UpdaterBanner from "@/components/organisms/banners/UpdaterBanner";
import { INSTALL_CHANNEL } from "@/lib/constants/updater.constants";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";
import type { UpdaterBannerState } from "@/store/types/ui.types";

function storeWithBannerState(updaterBanner: UpdaterBannerState) {
  return configureStore({
    reducer: { ui: uiReducer, settings: settingsReducer },
    preloadedState: {
      ui: {
        sidebarCollapsed: false,
        searchOpen: false,
        importDialogOpen: false,
        refreshNonce: 0,
        updaterBanner,
      } as never,
    },
  });
}

const storeWithBanner = storeWithBannerState({
  version: "1.4.0",
  currentVersion: "1.3.2",
  body: null,
  canAutoInstall: true,
  downloadUrl: null,
});

const storeWithPackageManagedBanner = storeWithBannerState({
  version: "1.4.0",
  currentVersion: "1.3.2",
  body: null,
  canAutoInstall: false,
  installChannel: INSTALL_CHANNEL.SYSTEM_PACKAGE,
  downloadUrl: null,
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

/** Flatpak/Snap/distro install — the notice stays, every install action is
 *  replaced by the package-manager hint. */
export const PackageManaged: Story = {
  decorators: [
    (Story) => (
      <ReduxProvider store={storeWithPackageManagedBanner}>
        <Story />
      </ReduxProvider>
    ),
  ],
};
