import type { Meta, StoryObj } from "@storybook/react-vite";

import FlakyReposCard from "@/components/organisms/activity/cards/FlakyReposCard";

const meta = {
  title: "Organisms/Activity/Cards/FlakyReposCard",
  component: FlakyReposCard,
  args: {
    rows: [
      { repoId: "r1", repoName: "recrest", failRate: 0.18, failed: 40, total: 220 },
      { repoId: "r2", repoName: "shared", failRate: 0.07, failed: 4, total: 60 },
    ],
  },
} satisfies Meta<typeof FlakyReposCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { rows: [] } };
