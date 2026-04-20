import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { WelcomeStep } from "@/components/organisms/onboarding/steps/WelcomeStep";

const meta: Meta<typeof WelcomeStep> = {
  title: "Organisms/Onboarding/Steps/WelcomeStep",
  component: WelcomeStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof WelcomeStep> = { args: { onNext: () => {} } };
