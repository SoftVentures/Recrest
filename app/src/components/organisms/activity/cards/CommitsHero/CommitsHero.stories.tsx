import type { Meta, StoryObj } from "@storybook/react-vite";

import CommitsHero from "@/components/organisms/activity/cards/CommitsHero";

const meta = {
  title: "Organisms/Activity/Cards/CommitsHero",
  component: CommitsHero,
  args: {
    commits: { current: 42, previous: 30, delta: 12 },
    sparkline: [2, 4, 1, 5, 0, 3, 6, 4, 2, 1, 3, 5, 7, 8],
  },
} satisfies Meta<typeof CommitsHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Up: Story = {};
export const Down: Story = {
  args: { commits: { current: 8, previous: 20, delta: -12 } },
};
export const Flat: Story = {
  args: { commits: { current: 10, previous: 10, delta: 0 } },
};
