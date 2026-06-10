import type { Meta, StoryObj } from "@storybook/react-vite";

import PickFolderStep from "@/components/organisms/onboarding/steps/PickFolderStep";

const meta: Meta<typeof PickFolderStep> = {
  title: "Organisms/Onboarding/PickFolderStep",
  component: PickFolderStep,
  parameters: { layout: "centered" },
  args: { onBack: () => undefined, onNext: () => undefined },
};
export default meta;

type Story = StoryObj<typeof PickFolderStep>;
export const Default: Story = {};
