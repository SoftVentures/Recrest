import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ProvidersPanel from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel";

const meta: Meta<typeof ProvidersPanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/ProvidersPanel",
  component: ProvidersPanel,
  decorators: [
    (Story) => (
      <Box sx={{ width: 880, height: 520 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProvidersPanel>;

export const NoConnections: Story = {
  args: { connectedProviders: [], onClose: () => {} },
};
