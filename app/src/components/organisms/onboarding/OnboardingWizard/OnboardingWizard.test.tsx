import { StorageKey } from "@recrest/shared";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import OnboardingWizard from "@/components/organisms/onboarding/OnboardingWizard";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

describe("OnboardingWizard", () => {
  it("does not render when the user has dismissed it before", () => {
    localStorage.setItem(StorageKey.ONBOARDING_DISMISSED, "true");
    const { queryByTestId } = renderWithProviders(<OnboardingWizard />);
    expect(queryByTestId(TEST_IDS.onboarding.root)).toBeNull();
  });

  it("renders the welcome step when first-run conditions are met", () => {
    localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
    const { queryByTestId } = renderWithProviders(<OnboardingWizard />);
    const root = queryByTestId(TEST_IDS.onboarding.root);
    expect(root).toBeTruthy();
    expect(queryByTestId(TEST_IDS.onboarding.step(OnboardingStep.WELCOME))).toBeTruthy();
  });

  it("navigates Welcome → Basics → Folders → Provider via the Continue buttons", () => {
    localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
    renderWithProviders(<OnboardingWizard />);

    fireEvent.click(screen.getByTestId(TEST_IDS.onboarding.welcomeNext));
    expect(screen.getByTestId(TEST_IDS.onboarding.step(OnboardingStep.BASICS))).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.onboarding.basicsNext));
    expect(
      screen.getByTestId(TEST_IDS.onboarding.step(OnboardingStep.FOLDERS)),
    ).toBeInTheDocument();
  });

  it("Back from Basics returns to Welcome", () => {
    localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
    renderWithProviders(<OnboardingWizard />);
    fireEvent.click(screen.getByTestId(TEST_IDS.onboarding.welcomeNext));
    fireEvent.click(screen.getByTestId(TEST_IDS.onboarding.basicsBack));
    expect(
      screen.getByTestId(TEST_IDS.onboarding.step(OnboardingStep.WELCOME)),
    ).toBeInTheDocument();
  });
});
