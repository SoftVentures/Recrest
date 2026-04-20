import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimeToMergeCard } from "@/components/organisms/activity/cards/TimeToMergeCard";

const meta: Meta<typeof TimeToMergeCard> = {
  title: "Organisms/Activity/TimeToMergeCard",
  component: TimeToMergeCard,
};
export default meta;

export const Default: StoryObj<typeof TimeToMergeCard> = {
  args: {
    buckets: [
      { bucket: "<1h", count: 4 },
      { bucket: "<1d", count: 12 },
      { bucket: "<3d", count: 6 },
      { bucket: ">=3d", count: 2 },
    ],
  },
};
