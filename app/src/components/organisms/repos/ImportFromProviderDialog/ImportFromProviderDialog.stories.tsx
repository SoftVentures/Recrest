import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { ImportFromProviderDialog } from "@/components/organisms/repos/ImportFromProviderDialog";
import { store } from "@/store";
import { setImportDialogOpen } from "@/store/slices/uiSlice";

const meta: Meta<typeof ImportFromProviderDialog> = {
  title: "Organisms/Repos/ImportFromProviderDialog",
  component: ImportFromProviderDialog,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};
export default meta;

export const Open: StoryObj<typeof ImportFromProviderDialog> = {
  render: () => {
    store.dispatch(setImportDialogOpen(true));
    return <ImportFromProviderDialog />;
  },
};

export const Closed: StoryObj<typeof ImportFromProviderDialog> = {
  render: () => {
    store.dispatch(setImportDialogOpen(false));
    return <ImportFromProviderDialog />;
  },
};
