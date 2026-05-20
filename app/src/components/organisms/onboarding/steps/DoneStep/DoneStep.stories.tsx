import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { DoneStep } from "@/components/organisms/onboarding/steps/DoneStep";

const meta: Meta<typeof DoneStep> = {
  title: "Organisms/Onboarding/Steps/DoneStep",
  component: DoneStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof DoneStep> = {
  args: { onBack: () => {}, onFinish: () => {} },
};
