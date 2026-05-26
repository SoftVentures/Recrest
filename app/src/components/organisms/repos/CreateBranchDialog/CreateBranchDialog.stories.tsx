import type { Meta, StoryObj } from "@storybook/react-vite";

import CreateBranchDialog from "@/components/organisms/repos/CreateBranchDialog";

const meta: Meta<typeof CreateBranchDialog> = {
  title: "Organisms/Repos/CreateBranchDialog",
  component: CreateBranchDialog,
  parameters: { layout: "centered" },
  args: { open: true, repoId: "demo-repo" as never, onClose: () => undefined },
};
export default meta;

type Story = StoryObj<typeof CreateBranchDialog>;
export const Open: Story = {};
export const Closed: Story = { args: { open: false } };
