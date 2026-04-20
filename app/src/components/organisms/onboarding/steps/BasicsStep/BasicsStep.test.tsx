import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { BasicsStep } from "@/components/organisms/onboarding/steps/BasicsStep";

describe("BasicsStep", () => {
  it("renders theme + language labels", () => {
    render(
      <OnboardingStepHarness>
        <BasicsStep onBack={() => {}} onNext={() => {}} />
      </OnboardingStepHarness>,
    );
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });

  it("advances when Next is pressed", () => {
    const onNext = vi.fn();
    render(
      <OnboardingStepHarness>
        <BasicsStep onBack={() => {}} onNext={onNext} />
      </OnboardingStepHarness>,
    );
    const buttons = screen.getAllByRole("button");
    // Next is always the last button in the dialog footer.
    fireEvent.click(buttons[buttons.length - 1]!);
    expect(onNext).toHaveBeenCalled();
  });
});
