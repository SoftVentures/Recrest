import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import PageTransition from "@/components/atoms/transitions/PageTransition";

const Stage = styled(Box)({ height: 240, width: 360 });

const meta: Meta<typeof PageTransition> = {
  title: "Atoms/Transitions/PageTransition",
  component: PageTransition,
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
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
