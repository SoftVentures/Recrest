import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralToaster from "@/components/molecules/feedback/GeneralToaster";

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
      <Box sx={{ display: "flex", gap: 1 }}>
        <GeneralButton onClick={() => toast.success("Saved")}>Success</GeneralButton>
        <GeneralButton variant="destructive" onClick={() => toast.error("Failed to save")}>
          Error
        </GeneralButton>
        <GeneralButton variant="outline" onClick={() => toast("Heads up")}>
          Neutral
        </GeneralButton>
      </Box>
    </>
  ),
};
