import type { Meta, StoryObj } from "@storybook/react-vite";

import StackedChartCard from "@/components/organisms/activity/cards/StackedChartCard";

const meta = {
  title: "Organisms/Activity/Cards/StackedChartCard",
  component: StackedChartCard,
  args: {
    stacked: Array.from({ length: 14 }, (_, i) => ({
      day: i,
      total: (i * 7) % 12,
      segments: [
        { repoId: "r1", repoName: "recrest", color: "#f97316", count: (i * 4) % 7 },
        { repoId: "r2", repoName: "shared", color: "#3178c6", count: (i * 3) % 5 },
      ],
    })),
    total: 110,
  },
} satisfies Meta<typeof StackedChartCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { stacked: [], total: 0 } };
export const Loading: Story = { args: { loading: true } };
