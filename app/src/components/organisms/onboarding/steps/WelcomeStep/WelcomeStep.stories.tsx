import type { Meta, StoryObj } from "@storybook/react-vite";

import WelcomeStep from "@/components/organisms/onboarding/steps/WelcomeStep";

const meta: Meta<typeof WelcomeStep> = {
  title: "Organisms/Onboarding/WelcomeStep",
  component: WelcomeStep,
  parameters: { layout: "centered" },
  args: { onNext: () => undefined },
};
export default meta;

type Story = StoryObj<typeof WelcomeStep>;
export const Default: Story = {};
