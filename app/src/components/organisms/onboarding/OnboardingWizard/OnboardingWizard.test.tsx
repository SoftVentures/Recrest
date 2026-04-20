import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { OnboardingWizard } from "@/components/organisms/onboarding/OnboardingWizard";
import { useFirstRun } from "@/hooks/useFirstRun";
import "@/i18n";
import { store } from "@/store";

vi.mock("@/hooks/useFirstRun", () => ({
  useFirstRun: vi.fn(),
}));

const mockedUseFirstRun = vi.mocked(useFirstRun);

describe("OnboardingWizard", () => {
  it("renders nothing when first-run conditions do not apply", () => {
    mockedUseFirstRun.mockReturnValue({ shouldShow: false, dismiss: () => {}, reopen: () => {} });
    const { container } = render(
      <Provider store={store}>
        <OnboardingWizard />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("opens the dialog when first-run conditions apply", () => {
    mockedUseFirstRun.mockReturnValue({ shouldShow: true, dismiss: () => {}, reopen: () => {} });
    render(
      <Provider store={store}>
        <OnboardingWizard />
      </Provider>,
    );
    // Radix portals the dialog into body — the heading is the simplest signal.
    expect(document.querySelector("[role='dialog']")).not.toBeNull();
  });
});
