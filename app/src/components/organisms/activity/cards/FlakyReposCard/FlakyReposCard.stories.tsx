import type { Meta, StoryObj } from "@storybook/react-vite";

import { FlakyReposCard } from "@/components/organisms/activity/cards/FlakyReposCard";

const meta: Meta<typeof FlakyReposCard> = {
  title: "Organisms/Activity/FlakyReposCard",
  component: FlakyReposCard,
};
export default meta;

export const Default: StoryObj<typeof FlakyReposCard> = {
  args: {
    rows: [
      { repoId: "r1", repoName: "flaky-svc", failRate: 0.42, failed: 21, total: 50 },
      { repoId: "r2", repoName: "edge-tests", failRate: 0.18, failed: 9, total: 50 },
      { repoId: "r3", repoName: "smoke", failRate: 0.05, failed: 3, total: 60 },
    ],
  },
};

export const Empty: StoryObj<typeof FlakyReposCard> = { args: { rows: [] } };
