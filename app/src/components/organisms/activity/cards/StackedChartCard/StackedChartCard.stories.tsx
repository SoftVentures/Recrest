import type { Meta, StoryObj } from "@storybook/react-vite";

import { StackedChartCard } from "@/components/organisms/activity/cards/StackedChartCard";
import { colorForRepo } from "@/lib/activityStats";

const demoStacked = Array.from({ length: 14 }, (_, day) => ({
  day,
  total: 2 + Math.floor(Math.random() * 8),
  segments: [
    {
      repoId: "r1",
      repoName: "recrest",
      count: 2 + Math.floor(Math.random() * 4),
      color: colorForRepo("r1"),
    },
    {
      repoId: "r2",
      repoName: "landing",
      count: 1 + Math.floor(Math.random() * 3),
      color: colorForRepo("r2"),
    },
  ],
}));

const meta: Meta<typeof StackedChartCard> = {
  title: "Organisms/Activity/StackedChartCard",
  component: StackedChartCard,
};
export default meta;

export const Default: StoryObj<typeof StackedChartCard> = {
  args: { stacked: demoStacked, total: 64 },
};
