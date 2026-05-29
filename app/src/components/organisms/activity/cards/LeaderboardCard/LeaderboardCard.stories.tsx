import type { Meta, StoryObj } from "@storybook/react-vite";

import LeaderboardCard from "@/components/organisms/activity/cards/LeaderboardCard";

const meta = {
  title: "Organisms/Activity/Cards/LeaderboardCard",
  component: LeaderboardCard,
  args: {
    buckets: [
      {
        author: "Sasha",
        email: "v@example.com",
        count: 24,
        share: 0.5,
        sparkline: [3, 4, 2, 5, 3, 4, 3],
      },
      {
        author: "Alice",
        email: "a@example.com",
        count: 14,
        share: 0.3,
        sparkline: [1, 2, 2, 3, 2, 2, 2],
      },
      { author: "Bob", email: null, count: 10, share: 0.2, sparkline: [1, 1, 2, 1, 2, 2, 1] },
    ],
  },
} satisfies Meta<typeof LeaderboardCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { buckets: [] } };
