import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ProvidersPanel from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel";

const Stage = styled(Box)({ width: 880, height: 520 });

const meta: Meta<typeof ProvidersPanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/ProvidersPanel",
  component: ProvidersPanel,
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProvidersPanel>;

export const NoConnections: Story = {
  args: { connectedProviders: [], onClose: () => {} },
};
