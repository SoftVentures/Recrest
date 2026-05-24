import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";

const meta: Meta<typeof GeneralTooltip> = {
  title: "Atoms/Feedback/GeneralTooltip",
  component: GeneralTooltip,
};

export default meta;

type Story = StoryObj<typeof GeneralTooltip>;

export const Default: Story = {
  render: () => (
    <GeneralTooltip title="Refresh the activity feed" placement="bottom">
      <Box component="span">
        <GeneralButton>Hover me</GeneralButton>
      </Box>
    </GeneralTooltip>
  ),
};
