import type { Meta, StoryObj } from "@storybook/react-vite";

import Header from "@/components/organisms/layout/Header";

const meta = {
  title: "Organisms/Layout/Header",
  component: Header,
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
