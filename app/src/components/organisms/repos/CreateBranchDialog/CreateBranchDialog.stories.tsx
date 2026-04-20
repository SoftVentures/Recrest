import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { CreateBranchDialog } from "@/components/organisms/repos/CreateBranchDialog";
import { store } from "@/store";

const meta: Meta<typeof CreateBranchDialog> = {
  title: "Organisms/Repos/CreateBranchDialog",
  component: CreateBranchDialog,
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

export const Open: StoryObj<typeof CreateBranchDialog> = {
  args: { open: true, repoId: "repo-1", onClose: () => {} },
};

export const Closed: StoryObj<typeof CreateBranchDialog> = {
  args: { open: false, repoId: null, onClose: () => {} },
};
