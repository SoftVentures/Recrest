import { useState } from "react";

import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralDrawer from "@/components/molecules/drawers/GeneralDrawer";

function DefaultDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GeneralButton onClick={() => setOpen(true)}>Open drawer</GeneralButton>
      <GeneralDrawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ padding: 2 }}>Drawer content</Box>
      </GeneralDrawer>
    </>
  );
}

const meta: Meta<typeof GeneralDrawer> = {
  title: "Molecules/Drawers/GeneralDrawer",
  component: GeneralDrawer,
};

export default meta;

type Story = StoryObj<typeof GeneralDrawer>;

export const Default: Story = { render: () => <DefaultDemo /> };
