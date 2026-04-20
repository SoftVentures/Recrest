import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthorClockCard } from "@/components/organisms/activity/cards/AuthorClockCard";

const meta: Meta<typeof AuthorClockCard> = {
  title: "Organisms/Activity/AuthorClockCard",
  component: AuthorClockCard,
};
export default meta;

export const Default: StoryObj<typeof AuthorClockCard> = {
  args: {
    hours: Array.from({ length: 24 }, (_, h) => {
      if (h < 6 || h > 22) return 0;
      const peak = Math.abs(h - 14);
      return Math.max(0, 10 - peak);
    }),
  },
};

export const Empty: StoryObj<typeof AuthorClockCard> = {
  args: { hours: Array.from({ length: 24 }, () => 0) },
};
