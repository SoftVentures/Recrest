import type { Meta, StoryObj } from "@storybook/react-vite";

import CiPassRateCard from "@/components/organisms/activity/cards/CiPassRateCard";

const meta = {
  title: "Organisms/Activity/Cards/CiPassRateCard",
  component: CiPassRateCard,
  args: {
    rows: Array.from({ length: 14 }, (_, i) => ({
      day: i,
      rate: 0.85 + (i % 3) * 0.04,
      passed: 17 + (i % 3),
      total: 20,
    })),
  },
} satisfies Meta<typeof CiPassRateCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { rows: [] } };
export const Loading: Story = { args: { loading: true } };
