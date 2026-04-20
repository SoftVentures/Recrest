import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { RepoStats } from "@/components/organisms/repos/RepoStats";
import { store } from "@/store";
import { makeRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof RepoStats> = {
  title: "Organisms/Repos/RepoStats",
  component: RepoStats,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};
export default meta;

export const Empty: StoryObj<typeof RepoStats> = { args: { repos: [] } };

export const Mixed: StoryObj<typeof RepoStats> = {
  args: {
    repos: [
      makeRepo({ id: "a" }),
      makeRepo({ id: "b", status: { ...makeRepo().status, dirty: true, behind: 2 } }),
      makeRepo({ id: "c", status: { ...makeRepo().status, dirty: true } }),
      makeRepo({ id: "d" }),
    ],
  },
};
