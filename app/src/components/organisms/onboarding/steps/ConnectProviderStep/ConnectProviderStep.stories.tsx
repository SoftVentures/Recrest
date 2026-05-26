import type { Meta, StoryObj } from "@storybook/react-vite";

import ConnectProviderStep from "@/components/organisms/onboarding/steps/ConnectProviderStep";

const meta: Meta<typeof ConnectProviderStep> = {
  title: "Organisms/Onboarding/ConnectProviderStep",
  component: ConnectProviderStep,
  parameters: { layout: "centered" },
  args: { onBack: () => undefined, onNext: () => undefined },
};
export default meta;

type Story = StoryObj<typeof ConnectProviderStep>;
export const Default: Story = {};
