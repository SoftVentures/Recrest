import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { InitialScanStep } from "@/components/organisms/onboarding/steps/InitialScanStep";

describe("InitialScanStep", () => {
  it("renders the scan heading + progress indicator", () => {
    render(
      <OnboardingStepHarness>
        <InitialScanStep onBack={() => {}} onNext={() => {}} />
      </OnboardingStepHarness>,
    );
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
