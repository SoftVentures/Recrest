import { useState } from "react";

import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";

function DefaultDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GeneralButton onClick={() => setOpen(true)}>Open modal</GeneralButton>
      <GeneralModal
        open={open}
        customTitle="Settings"
        subtitle="Tweak how Recrest behaves"
        onCloseModal={() => setOpen(false)}
        contentChildren={<Box>Body</Box>}
        actionsChildren={<GeneralButton onClick={() => setOpen(false)}>Done</GeneralButton>}
      />
    </>
  );
}

const meta: Meta<typeof GeneralModal> = {
  title: "Molecules/Modals/GeneralModal",
  component: GeneralModal,
};

export default meta;

type Story = StoryObj<typeof GeneralModal>;

export const Default: Story = { render: () => <DefaultDemo /> };
