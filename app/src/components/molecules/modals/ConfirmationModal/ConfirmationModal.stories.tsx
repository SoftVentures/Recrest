import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";

function DefaultDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GeneralButton variant="destructive" onClick={() => setOpen(true)}>
        Delete repo
      </GeneralButton>
      <ConfirmationModal
        open={open}
        title="Delete repository"
        description="This will remove the repo from Recrest. The folder on disk is not touched."
        confirmLabel="Delete"
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

const meta: Meta<typeof ConfirmationModal> = {
  title: "Molecules/Modals/ConfirmationModal",
  component: ConfirmationModal,
};

export default meta;

type Story = StoryObj<typeof ConfirmationModal>;

export const Default: Story = { render: () => <DefaultDemo /> };
