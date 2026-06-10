import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import LocalPanel from "@/components/molecules/modals/AddRepoModal/panels/LocalPanel";

const Stage = styled(Box)(({ theme }) => ({ width: 560, padding: theme.spacing(2) }));

const meta: Meta<typeof LocalPanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/LocalPanel",
  component: LocalPanel,
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LocalPanel>;

export const Default: Story = { args: { onClose: () => {} } };
