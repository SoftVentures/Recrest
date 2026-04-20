import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { FindAcrossReposDialog } from "@/components/organisms/repos/FindAcrossReposDialog";
import { store } from "@/store";
import { setFindDialogOpen } from "@/store/slices/uiSlice";

const meta: Meta<typeof FindAcrossReposDialog> = {
  title: "Organisms/Repos/FindAcrossReposDialog",
  component: FindAcrossReposDialog,
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

export const Open: StoryObj<typeof FindAcrossReposDialog> = {
  render: () => {
    store.dispatch(setFindDialogOpen(true));
    return <FindAcrossReposDialog />;
  },
};

export const Closed: StoryObj<typeof FindAcrossReposDialog> = {
  render: () => {
    store.dispatch(setFindDialogOpen(false));
    return <FindAcrossReposDialog />;
  },
};
