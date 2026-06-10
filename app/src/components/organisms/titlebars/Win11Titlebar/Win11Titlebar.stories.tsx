import type { Meta, StoryObj } from "@storybook/react-vite";

import Win11Titlebar from "@/components/organisms/titlebars/Win11Titlebar";

const meta = {
  title: "Organisms/Titlebars/Win11Titlebar",
  component: Win11Titlebar,
  args: { isMaximized: false },
} satisfies Meta<typeof Win11Titlebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Maximized: Story = { args: { isMaximized: true } };
