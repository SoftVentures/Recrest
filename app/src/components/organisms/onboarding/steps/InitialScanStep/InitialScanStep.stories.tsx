import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { InitialScanStep } from "@/components/organisms/onboarding/steps/InitialScanStep";

const meta: Meta<typeof InitialScanStep> = {
  title: "Organisms/Onboarding/Steps/InitialScanStep",
  component: InitialScanStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof InitialScanStep> = {
  args: { onBack: () => {}, onNext: () => {} },
};
