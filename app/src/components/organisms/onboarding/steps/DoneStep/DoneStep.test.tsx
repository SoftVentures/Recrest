import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { DoneStep } from "@/components/organisms/onboarding/steps/DoneStep";

describe("DoneStep", () => {
  it("calls onFinish when the CTA is pressed", () => {
    const onFinish = vi.fn();
    render(
      <OnboardingStepHarness>
        <DoneStep onFinish={onFinish} />
      </OnboardingStepHarness>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
