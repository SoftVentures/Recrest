import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralToaster from "@/components/molecules/feedback/GeneralToaster";

const ButtonRow = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

const meta: Meta<typeof GeneralToaster> = {
  title: "Molecules/Feedback/GeneralToaster",
  component: GeneralToaster,
};

export default meta;

type Story = StoryObj<typeof GeneralToaster>;

export const Default: Story = {
  render: () => (
    <>
      <GeneralToaster />
      <ButtonRow>
        {/* eslint-disable no-restricted-syntax -- Storybook demo copy is English-only, not shipped to users */}
        <GeneralButton onClick={() => toast.success("Saved")}>Success</GeneralButton>
        <GeneralButton variant="destructive" onClick={() => toast.error("Failed to save")}>
          Error
        </GeneralButton>
        <GeneralButton variant="outline" onClick={() => toast("Heads up")}>
          Neutral
        </GeneralButton>
        {/* eslint-enable no-restricted-syntax */}
      </ButtonRow>
    </>
  ),
};
