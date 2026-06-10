import type { Meta, StoryObj } from "@storybook/react-vite";

import InitialScanStep from "@/components/organisms/onboarding/steps/InitialScanStep";

const meta: Meta<typeof InitialScanStep> = {
  title: "Organisms/Onboarding/InitialScanStep",
  component: InitialScanStep,
  parameters: { layout: "centered" },
  args: { onBack: () => undefined, onNext: () => undefined },
};
export default meta;

type Story = StoryObj<typeof InitialScanStep>;
export const Default: Story = {};
