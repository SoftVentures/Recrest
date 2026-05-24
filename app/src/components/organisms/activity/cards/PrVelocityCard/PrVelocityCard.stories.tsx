import type { Meta, StoryObj } from "@storybook/react-vite";

import PrVelocityCard from "@/components/organisms/activity/cards/PrVelocityCard";

const meta = {
  title: "Organisms/Activity/Cards/PrVelocityCard",
  component: PrVelocityCard,
  args: {
    rows: Array.from({ length: 14 }, (_, i) => ({
      day: i,
      opened: (i * 3) % 7,
      merged: (i * 2) % 6,
    })),
  },
} satisfies Meta<typeof PrVelocityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { rows: [] } };
export const Loading: Story = { args: { loading: true } };
