import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommitsHero } from "@/components/organisms/activity/cards/CommitsHero";

const meta: Meta<typeof CommitsHero> = {
  title: "Organisms/Activity/CommitsHero",
  component: CommitsHero,
};
export default meta;

export const Default: StoryObj<typeof CommitsHero> = {
  args: {
    commits: { current: 42, previous: 30, delta: 12 },
    sparkline: [3, 8, 5, 12, 7, 9, 4],
  },
};

export const Flat: StoryObj<typeof CommitsHero> = {
  args: {
    commits: { current: 10, previous: 10, delta: 0 },
    sparkline: [2, 2, 1, 1, 2, 1, 1],
  },
};

export const Down: StoryObj<typeof CommitsHero> = {
  args: {
    commits: { current: 4, previous: 20, delta: -16 },
    sparkline: [1, 0, 1, 0, 1, 1, 0],
  },
};
