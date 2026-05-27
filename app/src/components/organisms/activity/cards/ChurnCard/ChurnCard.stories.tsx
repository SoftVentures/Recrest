import type { Meta, StoryObj } from "@storybook/react-vite";

import ChurnCard from "@/components/organisms/activity/cards/ChurnCard";

const meta = {
  title: "Organisms/Activity/Cards/ChurnCard",
  component: ChurnCard,
  args: {
    rows: [
      { repoId: "r1", repoName: "recrest", added: 320, removed: 80, total: 400 },
      { repoId: "r2", repoName: "shared", added: 90, removed: 30, total: 120 },
    ],
  },
} satisfies Meta<typeof ChurnCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { rows: [] } };
export const Loading: Story = { args: { loading: true } };
