import type { Meta, StoryObj } from "@storybook/react-vite";

import { StreakCard } from "@/components/organisms/activity/cards/StreakCard";

const meta: Meta<typeof StreakCard> = {
  title: "Organisms/Activity/StreakCard",
  component: StreakCard,
};
export default meta;

export const Hot: StoryObj<typeof StreakCard> = { args: { streak: 7, longest: 14 } };
export const Warming: StoryObj<typeof StreakCard> = { args: { streak: 2, longest: 9 } };
export const Cold: StoryObj<typeof StreakCard> = { args: { streak: 0, longest: 5 } };
