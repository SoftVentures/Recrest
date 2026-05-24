import type { Meta, StoryObj } from "@storybook/react-vite";

import Sidebar from "@/components/organisms/layout/Sidebar";

const meta = {
  title: "Organisms/Layout/Sidebar",
  component: Sidebar,
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
