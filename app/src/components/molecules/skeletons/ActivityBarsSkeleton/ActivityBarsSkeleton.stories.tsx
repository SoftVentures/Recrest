import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActivityBarsSkeleton } from "@/components/molecules/skeletons/ActivityBarsSkeleton";

const meta: Meta<typeof ActivityBarsSkeleton> = {
  title: "Molecules/Skeletons/ActivityBarsSkeleton",
  component: ActivityBarsSkeleton,
};

export default meta;

export const Default: StoryObj<typeof ActivityBarsSkeleton> = {};

/** Demonstrates how the skeleton sits inside the usual dashboard card chrome. */
export const InDashboardCard: StoryObj<typeof ActivityBarsSkeleton> = {
  render: () => (
    <div className="a-dash-card" style={{ width: 420 }}>
      <div className="a-dash-card-h">
        <div className="text-sm font-medium">Activity (14d)</div>
      </div>
      <ActivityBarsSkeleton />
    </div>
  ),
};
