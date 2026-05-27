import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import Kbd, { KbdSize } from "@/components/atoms/inputs/Kbd";

const Row = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
}) as typeof Box;

const meta: Meta<typeof Kbd> = {
  title: "Atoms/Inputs/Kbd",
  component: Kbd,
  parameters: { layout: "centered" },
  argTypes: {
    size: {
      control: { type: "inline-radio" },
      options: [KbdSize.SM, KbdSize.MD],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Kbd>;

export const Small: Story = { args: { children: "⌘K", size: KbdSize.SM } };
export const Medium: Story = { args: { children: "⌘K", size: KbdSize.MD } };

export const Combo: Story = {
  render: () => (
    <Row>
      <Kbd>⌘</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>F</Kbd>
    </Row>
  ),
};

export const InlineHint: Story = {
  render: () => (
    <Row>
      <Box component="span">Open search</Box>
      <Kbd>⌘K</Kbd>
    </Row>
  ),
};
