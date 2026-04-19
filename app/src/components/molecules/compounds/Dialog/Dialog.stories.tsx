import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/molecules/compounds/Dialog";

const meta: Meta = {
  title: "Molecules/Compounds/Dialog",
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add scan path</DialogTitle>
          <DialogDescription>
            Recrest will index all git repositories found under the selected folder.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Add path</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const DestructiveConfirmation: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Remove repository</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove repository?</DialogTitle>
          <DialogDescription>
            This will remove the repository from Recrest. The files on disk are untouched.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithoutCloseButton: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open blocking dialog</Button>
      </DialogTrigger>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>Scanning in progress</DialogTitle>
          <DialogDescription>
            This dialog cannot be dismissed until the scan completes.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
