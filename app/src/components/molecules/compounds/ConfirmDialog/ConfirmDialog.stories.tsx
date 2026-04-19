import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/atoms/Button";
import { ConfirmDialog } from "@/components/molecules/compounds/ConfirmDialog";

const meta: Meta<typeof ConfirmDialog> = {
  title: "Molecules/Compounds/ConfirmDialog",
  component: ConfirmDialog,
};

export default meta;

function DefaultStory() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open confirm</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Refresh all repositories?"
        description="Status will be re-read for every known repository."
        onConfirm={() => void 0}
      />
    </>
  );
}

function DestructiveStory() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Remove repository
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title="Remove this repository?"
        description="Recrest will stop tracking it. The folder on disk is not affected."
        confirmLabel="Remove"
        onConfirm={() => void 0}
      />
    </>
  );
}

function WithRememberChoiceStory() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Discard working changes
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title="Discard local changes?"
        description="All unstaged changes in this repository will be lost."
        confirmLabel="Discard"
        rememberKey="sb.confirm.discard"
        onConfirm={() => void 0}
      />
    </>
  );
}

export const Default: StoryObj<typeof ConfirmDialog> = { render: () => <DefaultStory /> };
export const Destructive: StoryObj<typeof ConfirmDialog> = {
  render: () => <DestructiveStory />,
};
export const WithRememberChoice: StoryObj<typeof ConfirmDialog> = {
  render: () => <WithRememberChoiceStory />,
};
