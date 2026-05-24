import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ClonePanel from "@/components/molecules/modals/AddRepoModal/panels/ClonePanel";

const meta: Meta<typeof ClonePanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/ClonePanel",
  component: ClonePanel,
  decorators: [
    (Story) => (
      <Box sx={{ width: 560, padding: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ClonePanel>;

export const Default: Story = { args: { onClose: () => {} } };
