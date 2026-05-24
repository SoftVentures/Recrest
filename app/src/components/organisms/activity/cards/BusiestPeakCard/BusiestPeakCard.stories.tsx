import type { Meta, StoryObj } from "@storybook/react-vite";

import BusiestPeakCard from "@/components/organisms/activity/cards/BusiestPeakCard";

const meta = {
  title: "Organisms/Activity/Cards/BusiestPeakCard",
  component: BusiestPeakCard,
  args: {
    stats: {
      commits: { current: 0, previous: 0, delta: 0 },
      authors: { current: 0, previous: 0, delta: 0 },
      repos: { current: 0, previous: 0, delta: 0 },
      currentStreak: 0,
      longestStreak: 0,
      busiestDay: { label: "Wed", count: 18 },
      peakHour: { label: "14:00", count: 9 },
      quietestRepos: [],
    },
  },
} satisfies Meta<typeof BusiestPeakCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
