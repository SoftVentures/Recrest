import type { Meta, StoryObj } from "@storybook/react-vite";

import Titlebar from "@/components/organisms/titlebars/Titlebar";

const meta = {
  title: "Organisms/Titlebars/Titlebar",
  component: Titlebar,
} satisfies Meta<typeof Titlebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
