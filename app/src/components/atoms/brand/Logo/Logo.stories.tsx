import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import Logo from "@/components/atoms/brand/Logo";

const meta: Meta<typeof Logo> = {
  title: "Atoms/Brand/Logo",
  component: Logo,
};

export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: (args) => (
    <Box sx={{ width: 64, height: 64 }}>
      <Logo {...args} />
    </Box>
  ),
};
