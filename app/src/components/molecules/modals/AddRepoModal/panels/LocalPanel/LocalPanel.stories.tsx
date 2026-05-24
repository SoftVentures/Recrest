import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import LocalPanel from "@/components/molecules/modals/AddRepoModal/panels/LocalPanel";

const meta: Meta<typeof LocalPanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/LocalPanel",
  component: LocalPanel,
  decorators: [
    (Story) => (
      <Box sx={{ width: 560, padding: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LocalPanel>;

export const Default: Story = { args: { onClose: () => {} } };
