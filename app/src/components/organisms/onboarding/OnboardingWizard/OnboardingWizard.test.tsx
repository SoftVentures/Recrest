import { StorageKey } from "@recrest/shared";

import { afterEach, describe, expect, it } from "vitest";

import OnboardingWizard from "@/components/organisms/onboarding/OnboardingWizard";
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
    // shouldShow gates on `settings.loading === false`, which the test store
    // satisfies (initialState has loading: false). With no scanPaths and no
    // providers it should mount.
    const root = queryByTestId(TEST_IDS.onboarding.root);
    expect(root).toBeTruthy();
  });
});
