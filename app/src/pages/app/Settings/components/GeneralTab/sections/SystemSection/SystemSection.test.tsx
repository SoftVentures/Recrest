import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SEED_SETTINGS } from "@/lib/dev/seed/settings";
import SystemSection from "@/pages/app/Settings/components/GeneralTab/sections/SystemSection";
import { loadSettings } from "@/store/actions/settings.actions";
import { renderWithProviders } from "@/test/utils";

describe("SystemSection", () => {
  it("reflects the persisted terminal + shell from settings (survives remount)", () => {
    const { store, getByTestId } = renderWithProviders(<SystemSection />);

    act(() => {
      store.dispatch(
        loadSettings.fulfilled(
          {
            ...SEED_SETTINGS,
            terminal: { id: "warp", profile: null, customCommand: null },
            shell: "zsh",
          },
          "req",
          undefined,
        ),
      );
    });

    expect(getByTestId(TEST_IDS.settings.general.defaultTerminalSelect)).toHaveTextContent("Warp");
    expect(getByTestId(TEST_IDS.settings.general.defaultShellSelect)).toHaveTextContent("Zsh");
  });
});
