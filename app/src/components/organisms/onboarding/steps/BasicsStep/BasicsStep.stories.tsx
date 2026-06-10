import type { Meta, StoryObj } from "@storybook/react-vite";

import BasicsStep from "@/components/organisms/onboarding/steps/BasicsStep";

const meta: Meta<typeof BasicsStep> = {
  title: "Organisms/Onboarding/BasicsStep",
  component: BasicsStep,
  parameters: { layout: "centered" },
  args: { onBack: () => undefined, onNext: () => undefined },
};
export default meta;

type Story = StoryObj<typeof BasicsStep>;
export const Default: Story = {};
