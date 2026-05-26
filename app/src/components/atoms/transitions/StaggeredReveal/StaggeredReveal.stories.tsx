import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";

const Item = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  background: "#f0f0f0",
  margin: theme.spacing(0.5),
}));

const meta: Meta<typeof StaggeredReveal> = {
  title: "Atoms/Transitions/StaggeredReveal",
  component: StaggeredReveal,
};

export default meta;

type Story = StoryObj<typeof StaggeredReveal>;

export const Default: Story = {
  render: () => (
    <StaggeredReveal>
      <Item>Item 1</Item>
      <Item>Item 2</Item>
      <Item>Item 3</Item>
      <Item>Item 4</Item>
    </StaggeredReveal>
  ),
};
