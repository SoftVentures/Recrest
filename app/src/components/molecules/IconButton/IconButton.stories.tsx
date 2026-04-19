import type { Meta, StoryObj } from "@storybook/react-vite";

import { Icon } from "@/components/atoms/Icon";
import { IconButton } from "@/components/molecules/IconButton";

const meta: Meta<typeof IconButton> = {
  title: "Molecules/IconButton",
  component: IconButton,
};

export default meta;

export const Default: StoryObj<typeof IconButton> = {
  args: {
    tooltip: "Fetch",
    children: <Icon name="refresh" size={14} />,
  },
};
