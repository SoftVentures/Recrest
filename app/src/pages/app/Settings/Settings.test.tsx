import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import SettingsPage from "@/pages/app/Settings";
import { renderWithProviders } from "@/test/utils";

describe("SettingsPage", () => {
  it("renders the settings view with the tab nav and footer", () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />);

    expect(getByTestId(TEST_IDS.settings.view)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tabs)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.navFooter)).toBeInTheDocument();
  });

  it("defaults to the general panel", () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />);

    expect(getByTestId(TEST_IDS.settings.panel("general"))).toBeInTheDocument();
  });

  it("renders a tab button for each settings section", () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />);

    expect(getByTestId(TEST_IDS.settings.tab("general"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("accounts"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("integrations"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("git"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("shortcuts"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("storage"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.tab("about"))).toBeInTheDocument();
  });

  it("switches to the storage panel when its tab is clicked", () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />);

    fireEvent.click(getByTestId(TEST_IDS.settings.tab("storage")));

    expect(getByTestId(TEST_IDS.settings.panel("storage"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.storage.crashReporting)).toBeInTheDocument();
  });

  it("switches to the shortcuts panel when its tab is clicked", () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />);

    fireEvent.click(getByTestId(TEST_IDS.settings.tab("shortcuts")));

    expect(getByTestId(TEST_IDS.settings.panel("shortcuts"))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.shortcuts.navigation)).toBeInTheDocument();
  });

  it("respects the ?tab= deeplink and opens that panel directly", async () => {
    const { getByTestId } = renderWithProviders(<SettingsPage />, {
      route: "/settings?tab=about",
    });

    // AboutSection fetches the app version on mount; await the settle so the
    // async state update happens inside act() (no console warning / flake).
    await waitFor(() => expect(getByTestId(TEST_IDS.settings.panel("about"))).toBeInTheDocument());
  });
});
