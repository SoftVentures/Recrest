import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingStepHarness } from "@/components/organisms/onboarding/_test-helpers";
import { PickFolderStep } from "@/components/organisms/onboarding/steps/PickFolderStep";

describe("PickFolderStep", () => {
  it("renders the empty-list hint when no paths exist yet", () => {
    render(
      <OnboardingStepHarness>
        <PickFolderStep onBack={() => {}} onNext={() => {}} />
      </OnboardingStepHarness>,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
