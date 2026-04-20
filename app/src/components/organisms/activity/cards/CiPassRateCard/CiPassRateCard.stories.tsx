import type { Meta, StoryObj } from "@storybook/react-vite";

import { CiPassRateCard } from "@/components/organisms/activity/cards/CiPassRateCard";

const meta: Meta<typeof CiPassRateCard> = {
  title: "Organisms/Activity/CiPassRateCard",
  component: CiPassRateCard,
};
export default meta;

export const Default: StoryObj<typeof CiPassRateCard> = {
  args: {
    rows: Array.from({ length: 14 }, (_, day) => ({
      day,
      passed: 8 + Math.floor(Math.random() * 3),
      total: 10,
      rate: 0.8 + Math.random() * 0.2,
    })),
  },
};
