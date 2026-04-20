import type { Meta, StoryObj } from "@storybook/react-vite";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { ConnectProviderStep } from "@/components/organisms/onboarding/steps/ConnectProviderStep";

const meta: Meta<typeof ConnectProviderStep> = {
  title: "Organisms/Onboarding/Steps/ConnectProviderStep",
  component: ConnectProviderStep,
  decorators: [
    (Story) => (
      <OnboardingStepHarness>
        <Story />
      </OnboardingStepHarness>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof ConnectProviderStep> = {
  args: { onBack: () => {}, onNext: () => {} },
};
