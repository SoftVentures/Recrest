import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { ConnectProviderStep } from "@/components/organisms/onboarding/steps/ConnectProviderStep";

describe("ConnectProviderStep", () => {
  it("renders one tab per provider", () => {
    render(
      <OnboardingStepHarness>
        <ConnectProviderStep onBack={() => {}} onNext={() => {}} />
      </OnboardingStepHarness>,
    );
    expect(screen.getByRole("tab", { name: /github/i })).toBeInTheDocument();
  });
});
