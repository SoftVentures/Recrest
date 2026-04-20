import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { RepoList } from "@/components/organisms/repos/RepoList";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof RepoList> = {
  title: "Organisms/Repos/RepoList",
  component: RepoList,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </Provider>
    ),
  ],
};
export default meta;

export const Empty: StoryObj<typeof RepoList> = {
  args: { repos: [], grouped: false },
};

export const Ungrouped: StoryObj<typeof RepoList> = {
  args: {
    grouped: false,
    repos: [
      makeEnrichedRepo({ id: "r1", name: "recrest" }),
      makeEnrichedRepo({ id: "r2", name: "landing" }),
      makeEnrichedRepo({ id: "r3", name: "shared" }),
    ],
  },
};

export const Grouped: StoryObj<typeof RepoList> = {
  args: {
    grouped: true,
    repos: [
      makeEnrichedRepo({ id: "r1", name: "recrest", path: "/Users/dev/SoftVentures/recrest" }),
      makeEnrichedRepo({ id: "r2", name: "landing", path: "/Users/dev/SoftVentures/landing" }),
      makeEnrichedRepo({
        id: "r3",
        name: "side-project",
        path: "/Users/dev/Personal/side-project",
      }),
    ],
  },
};
