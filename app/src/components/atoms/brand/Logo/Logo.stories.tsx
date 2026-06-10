import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import Logo from "@/components/atoms/brand/Logo";

const Stage = styled(Box)({ width: 64, height: 64 });

const meta: Meta<typeof Logo> = {
  title: "Atoms/Brand/Logo",
  component: Logo,
};

export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: (args) => (
    <Stage>
      <Logo {...args} />
    </Stage>
  ),
};
