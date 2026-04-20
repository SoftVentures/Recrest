import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { BasicsStep } from "@/components/organisms/onboarding/steps/BasicsStep";

const meta: Meta<typeof BasicsStep> = {
  title: "Organisms/Onboarding/Steps/BasicsStep",
  component: BasicsStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof BasicsStep> = {
  args: { onBack: () => {}, onNext: () => {} },
};
