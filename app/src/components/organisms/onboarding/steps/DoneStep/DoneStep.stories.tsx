import type { Meta, StoryObj } from "@storybook/react-vite";

import DoneStep from "@/components/organisms/onboarding/steps/DoneStep";

const meta: Meta<typeof DoneStep> = {
  title: "Organisms/Onboarding/DoneStep",
  component: DoneStep,
  parameters: { layout: "centered" },
  args: { onFinish: () => undefined },
};
export default meta;

type Story = StoryObj<typeof DoneStep>;
export const Default: Story = {};
