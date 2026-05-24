import type { Meta, StoryObj } from "@storybook/react-vite";

import AuthorClockCard from "@/components/organisms/activity/cards/AuthorClockCard";

const meta = {
  title: "Organisms/Activity/Cards/AuthorClockCard",
  component: AuthorClockCard,
  args: {
    hours: Array.from({ length: 24 }, (_, h) => (h >= 9 && h <= 18 ? 4 + ((h * 3) % 7) : 0)),
  },
} satisfies Meta<typeof AuthorClockCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { hours: Array(24).fill(0) } };
export const Loading: Story = { args: { loading: true } };
