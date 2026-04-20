import type { Meta, StoryObj } from "@storybook/react-vite";

import { HeatmapCard } from "@/components/organisms/activity/cards/HeatmapCard";

function demoMatrix(): number[][] {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      // Emulate typical Mon-Fri 9-18 activity.
      if (d >= 5) return Math.random() > 0.8 ? 1 : 0;
      if (h < 8 || h > 20) return 0;
      return Math.floor(Math.random() * 8);
    }),
  );
}

const meta: Meta<typeof HeatmapCard> = {
  title: "Organisms/Activity/HeatmapCard",
  component: HeatmapCard,
};
export default meta;

export const Default: StoryObj<typeof HeatmapCard> = { args: { matrix: demoMatrix() } };
export const Empty: StoryObj<typeof HeatmapCard> = {
  args: {
    matrix: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
  },
};
