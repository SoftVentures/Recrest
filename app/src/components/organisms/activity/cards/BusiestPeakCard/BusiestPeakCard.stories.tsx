import type { Meta, StoryObj } from "@storybook/react-vite";

import { BusiestPeakCard } from "@/components/organisms/activity/cards/BusiestPeakCard";
import type { ActivityStats } from "@/lib/activityStats";

const demoStats: ActivityStats = {
  commits: { current: 42, previous: 30, delta: 12 },
  authors: { current: 5, previous: 3, delta: 2 },
  repos: { current: 6, previous: 5, delta: 1 },
  currentStreak: 4,
  longestStreak: 9,
  busiestDay: { label: "Thu", count: 14 },
  peakHour: { label: "10:00–12:00", count: 11 },
  quietestRepos: [],
};

const meta: Meta<typeof BusiestPeakCard> = {
  title: "Organisms/Activity/BusiestPeakCard",
  component: BusiestPeakCard,
};
export default meta;

export const Default: StoryObj<typeof BusiestPeakCard> = { args: { stats: demoStats } };
