import type { Meta, StoryObj } from "@storybook/react-vite";

import ClickableRow from "@/components/molecules/rows/ClickableRow";

const meta = {
  title: "Molecules/Rows/ClickableRow",
  component: ClickableRow,
  args: { children: "Click this row" },
} satisfies Meta<typeof ClickableRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
