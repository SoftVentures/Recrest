import type { Meta, StoryObj } from "@storybook/react-vite";

import { LeaderboardCard } from "@/components/organisms/activity/cards/LeaderboardCard";

const spark = (values: number[]) => {
  const out = [...values];
  while (out.length < 14) out.push(0);
  return out.slice(0, 14);
};

const meta: Meta<typeof LeaderboardCard> = {
  title: "Organisms/Activity/LeaderboardCard",
  component: LeaderboardCard,
};
export default meta;

export const Default: StoryObj<typeof LeaderboardCard> = {
  args: {
    buckets: [
      {
        author: "alice",
        email: "alice@example.com",
        count: 24,
        share: 0.5,
        sparkline: spark([2, 3, 1, 4, 2, 0, 3]),
      },
      {
        author: "bob",
        email: null,
        count: 14,
        share: 0.3,
        sparkline: spark([1, 0, 2, 1, 1, 2, 0]),
      },
      {
        author: "carol",
        email: null,
        count: 10,
        share: 0.2,
        sparkline: spark([0, 1, 1, 0, 2, 1, 1]),
      },
    ],
  },
};

export const Empty: StoryObj<typeof LeaderboardCard> = { args: { buckets: [] } };
