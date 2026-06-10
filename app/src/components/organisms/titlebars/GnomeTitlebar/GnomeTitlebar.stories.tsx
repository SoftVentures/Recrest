import type { Meta, StoryObj } from "@storybook/react-vite";

import GnomeTitlebar from "@/components/organisms/titlebars/GnomeTitlebar";

const meta = {
  title: "Organisms/Titlebars/GnomeTitlebar",
  component: GnomeTitlebar,
} satisfies Meta<typeof GnomeTitlebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
