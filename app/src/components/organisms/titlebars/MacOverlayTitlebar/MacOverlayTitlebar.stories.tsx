import type { Meta, StoryObj } from "@storybook/react-vite";

import MacOverlayTitlebar from "@/components/organisms/titlebars/MacOverlayTitlebar";

const meta = {
  title: "Organisms/Titlebars/MacOverlayTitlebar",
  component: MacOverlayTitlebar,
} satisfies Meta<typeof MacOverlayTitlebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
