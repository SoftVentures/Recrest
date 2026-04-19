import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimelineEventsSkeleton } from "@/components/molecules/skeletons/TimelineEventsSkeleton";

const meta: Meta<typeof TimelineEventsSkeleton> = {
  title: "Molecules/Skeletons/TimelineEventsSkeleton",
  component: TimelineEventsSkeleton,
};

export default meta;

export const Default: StoryObj<typeof TimelineEventsSkeleton> = {};
export const SingleRow: StoryObj<typeof TimelineEventsSkeleton> = { args: { rows: 1 } };
export const ManyRows: StoryObj<typeof TimelineEventsSkeleton> = { args: { rows: 10 } };
