import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";

const meta: Meta<typeof StaggeredReveal> = {
  title: "Atoms/Transitions/StaggeredReveal",
  component: StaggeredReveal,
};

export default meta;

type Story = StoryObj<typeof StaggeredReveal>;

export const Default: Story = {
  render: () => (
    <StaggeredReveal>
      <Box sx={{ padding: 1, background: "#f0f0f0", margin: 0.5 }}>Item 1</Box>
      <Box sx={{ padding: 1, background: "#f0f0f0", margin: 0.5 }}>Item 2</Box>
      <Box sx={{ padding: 1, background: "#f0f0f0", margin: 0.5 }}>Item 3</Box>
      <Box sx={{ padding: 1, background: "#f0f0f0", margin: 0.5 }}>Item 4</Box>
    </StaggeredReveal>
  ),
};
