import type { Meta, StoryObj } from "@storybook/react-vite";

import TimeToMergeCard from "@/components/organisms/activity/cards/TimeToMergeCard";

const meta = {
  title: "Organisms/Activity/Cards/TimeToMergeCard",
  component: TimeToMergeCard,
  args: {
    buckets: [
      { bucket: "<1h", count: 4 },
      { bucket: "<1d", count: 12 },
      { bucket: "<3d", count: 7 },
      { bucket: ">=3d", count: 2 },
    ],
  },
} satisfies Meta<typeof TimeToMergeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
