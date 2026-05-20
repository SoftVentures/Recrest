import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { DoneStep } from "@/components/organisms/onboarding/steps/DoneStep";

describe("DoneStep", () => {
  it("calls onFinish when the CTA is pressed", () => {
    const onFinish = vi.fn();
    render(
      <OnboardingStepHarness>
        <DoneStep onBack={() => {}} onFinish={onFinish} />
      </OnboardingStepHarness>,
    );
    // Two buttons exist now: Back + CTA. The CTA is the primary one — query
    // by the "Open dashboard" / "Dashboard öffnen" CTA text via name=onFinish.
    fireEvent.click(screen.getByRole("button", { name: /open dashboard|dashboard öffnen/i }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("calls onBack when the back button is pressed", () => {
    const onBack = vi.fn();
    render(
      <OnboardingStepHarness>
        <DoneStep onBack={onBack} onFinish={() => {}} />
      </OnboardingStepHarness>,
    );
    fireEvent.click(screen.getByRole("button", { name: /back|zurück/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
