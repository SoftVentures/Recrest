import type { Meta, StoryObj } from "@storybook/react-vite";

import Timeline from "@/components/organisms/activity/Timeline";

const today = new Date("2025-02-15T12:00:00Z");

const meta = {
  title: "Organisms/Activity/Timeline",
  component: Timeline,
  args: {
    commits: [],
    prEvents: [],
    checkRuns: [],
    today,
    reposById: new Map(),
  },
} satisfies Meta<typeof Timeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
