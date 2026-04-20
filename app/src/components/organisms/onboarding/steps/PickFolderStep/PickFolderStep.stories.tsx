import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { PickFolderStep } from "@/components/organisms/onboarding/steps/PickFolderStep";

const meta: Meta<typeof PickFolderStep> = {
  title: "Organisms/Onboarding/Steps/PickFolderStep",
  component: PickFolderStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof PickFolderStep> = {
  args: { onBack: () => {}, onNext: () => {} },
};
