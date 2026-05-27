import type { Meta, StoryObj } from "@storybook/react-vite";

import OverallSearch from "@/components/organisms/OverallSearch";

const meta = {
  title: "Organisms/OverallSearch",
  component: OverallSearch,
} satisfies Meta<typeof OverallSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
