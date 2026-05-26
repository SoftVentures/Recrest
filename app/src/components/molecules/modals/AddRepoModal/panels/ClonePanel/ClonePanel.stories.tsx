import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import ClonePanel from "@/components/molecules/modals/AddRepoModal/panels/ClonePanel";

const Stage = styled(Box)(({ theme }) => ({ width: 560, padding: theme.spacing(2) }));

const meta: Meta<typeof ClonePanel> = {
  title: "Molecules/Modals/AddRepoModal/Panels/ClonePanel",
  component: ClonePanel,
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ClonePanel>;

export const Default: Story = { args: { onClose: () => {} } };
