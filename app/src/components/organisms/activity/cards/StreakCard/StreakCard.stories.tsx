import type { Meta, StoryObj } from "@storybook/react-vite";

import StreakCard from "@/components/organisms/activity/cards/StreakCard";

const meta = {
  title: "Organisms/Activity/Cards/StreakCard",
  component: StreakCard,
  args: { streak: 5, longest: 12 },
} satisfies Meta<typeof StreakCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OnFire: Story = {};
export const Cold: Story = { args: { streak: 0, longest: 12 } };
export const NewBest: Story = { args: { streak: 12, longest: 12 } };
