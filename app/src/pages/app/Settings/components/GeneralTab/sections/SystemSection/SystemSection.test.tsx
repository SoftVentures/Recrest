import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SEED_SETTINGS } from "@/lib/dev/seed/settings";
import SystemSection from "@/pages/app/Settings/components/GeneralTab/sections/SystemSection";
import { loadSettings } from "@/store/actions/settings.actions";
import { renderWithProviders } from "@/test/utils";

function renderWithTerminal(id: string, profile: string | null = null) {
  const utils = renderWithProviders(<SystemSection />);
  act(() => {
    utils.store.dispatch(
      loadSettings.fulfilled(
        {
          ...SEED_SETTINGS,
          terminal: { id, profile, customCommand: null },
          shell: "zsh",
        },
        "req",
        undefined,
      ),
    );
  });
  return utils;
}

describe("SystemSection", () => {
  it("reflects the persisted terminal + shell from settings (survives remount)", () => {
    const { getByTestId } = renderWithTerminal("warp");

    expect(getByTestId(TEST_IDS.settings.general.defaultTerminalSelect)).toHaveTextContent("Warp");
    expect(getByTestId(TEST_IDS.settings.general.defaultShellSelect)).toHaveTextContent("Zsh");
  });

  it("shows the profile input only for profile-capable terminals", () => {
    const { getByTestId } = renderWithTerminal("windows-terminal");
    expect(getByTestId(TEST_IDS.settings.general.terminalProfileInput)).toBeInTheDocument();
  });

  it("hides the profile input for incapable terminals", () => {
    const { queryByTestId } = renderWithTerminal("kitty");
    expect(queryByTestId(TEST_IDS.settings.general.terminalProfileInput)).not.toBeInTheDocument();
  });

  it("shows the custom command field only when custom command mode is active", () => {
    const { getByTestId } = renderWithTerminal("custom");
    expect(getByTestId(TEST_IDS.settings.general.terminalCustomCommandInput)).toBeInTheDocument();
  });

  it("hides the custom command field for a normal terminal", () => {
    const { queryByTestId } = renderWithTerminal("warp");
    expect(
      queryByTestId(TEST_IDS.settings.general.terminalCustomCommandInput),
    ).not.toBeInTheDocument();
  });
});
