import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";

import { OnboardingWizard } from "@/components/organisms/onboarding/OnboardingWizard";
import { store } from "@/store";

// Stories can't easily force the first-run branch without mocking, so we show
// the individual steps under their own entries. This story just confirms the
// wizard renders nothing when it isn't triggered (the production default).
const meta: Meta<typeof OnboardingWizard> = {
  title: "Organisms/Onboarding/OnboardingWizard",
  component: OnboardingWizard,
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};
export default meta;

export const Dormant: StoryObj<typeof OnboardingWizard> = {};
