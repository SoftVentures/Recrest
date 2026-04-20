import type { Meta, StoryObj } from "@storybook/react-vite";

import { PrVelocityCard } from "@/components/organisms/activity/cards/PrVelocityCard";

const meta: Meta<typeof PrVelocityCard> = {
  title: "Organisms/Activity/PrVelocityCard",
  component: PrVelocityCard,
};
export default meta;

export const Default: StoryObj<typeof PrVelocityCard> = {
  args: {
    rows: Array.from({ length: 14 }, (_, day) => ({
      day,
      opened: 1 + Math.floor(Math.random() * 4),
      merged: Math.floor(Math.random() * 3),
    })),
  },
};

export const Empty: StoryObj<typeof PrVelocityCard> = {
  args: {
    rows: Array.from({ length: 14 }, (_, day) => ({ day, opened: 0, merged: 0 })),
  },
};
