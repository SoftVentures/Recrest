import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import PageTransition from "@/components/atoms/transitions/PageTransition";

const meta: Meta<typeof PageTransition> = {
  title: "Atoms/Transitions/PageTransition",
  component: PageTransition,
  decorators: [
    (Story) => (
      <Box sx={{ height: 240, width: 360 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PageTransition>;

export const Default: Story = {
  render: () => (
    <PageTransition>
      <Box>Hello, page</Box>
    </PageTransition>
  ),
};
