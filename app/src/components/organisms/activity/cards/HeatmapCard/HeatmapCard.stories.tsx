import type { Meta, StoryObj } from "@storybook/react-vite";

import HeatmapCard from "@/components/organisms/activity/cards/HeatmapCard";
import type { HeatmapMatrix } from "@/lib/activityAggregates";

const emptyMatrix: HeatmapMatrix = Array.from({ length: 7 }, () =>
  Array(24).fill(0),
) as HeatmapMatrix;
const sampleMatrix: HeatmapMatrix = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) =>
    h >= 9 && h <= 18 && d < 5 ? Math.floor(Math.random() * 6) : 0,
  ),
) as HeatmapMatrix;

const meta = {
  title: "Organisms/Activity/Cards/HeatmapCard",
  component: HeatmapCard,
  args: { matrix: sampleMatrix },
} satisfies Meta<typeof HeatmapCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { matrix: emptyMatrix } };
export const Loading: Story = { args: { loading: true } };
