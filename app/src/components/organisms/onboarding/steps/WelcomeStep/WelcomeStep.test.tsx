import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { WelcomeStep } from "@/components/organisms/onboarding/steps/WelcomeStep";

describe("WelcomeStep", () => {
  it("renders the welcome heading", () => {
    render(
      <OnboardingStepHarness>
        <WelcomeStep onNext={() => {}} />
      </OnboardingStepHarness>,
    );
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("calls onNext when the CTA is pressed", () => {
    const onNext = vi.fn();
    render(
      <OnboardingStepHarness>
        <WelcomeStep onNext={onNext} />
      </OnboardingStepHarness>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
