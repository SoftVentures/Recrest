import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { PrList } from "@/components/organisms/prs/PrList";
import { store } from "@/store";
import { setPrs } from "@/store/slices/prsSlice";
import { upsertRepo } from "@/store/slices/reposSlice";
import { makePullRequest, sampleRepo } from "@/test-utils/fixtures";

const meta: Meta<typeof PrList> = {
  title: "Organisms/PRs/PrList",
  component: PrList,
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

export const Empty: StoryObj<typeof PrList> = {
  render: () => {
    store.dispatch(setPrs({ repoId: sampleRepo.id, prs: [] }));
    return <PrList />;
  },
};

export const Populated: StoryObj<typeof PrList> = {
  render: () => {
    store.dispatch(upsertRepo(sampleRepo));
    store.dispatch(
      setPrs({
        repoId: sampleRepo.id,
        prs: [
          makePullRequest({ id: "1", number: 101, title: "feat: activity cockpit" }),
          makePullRequest({
            id: "2",
            number: 102,
            title: "chore: bump deps",
            ciStatus: "success",
          }),
          makePullRequest({
            id: "3",
            number: 103,
            title: "fix: flaky CI",
            ciStatus: "failure",
            draft: true,
          }),
        ],
      }),
    );
    return <PrList />;
  },
};
