import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { ShortcutsSection } from "@/pages/app/Settings/components/ShortcutsTab";
import { renderWithProviders } from "@/test/utils";

describe("ShortcutsSection", () => {
  it("renders the navigation, git, and editor shortcut sections", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    expect(getByTestId(TEST_IDS.settings.shortcuts.navigation)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.shortcuts.git)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.shortcuts.editor)).toBeInTheDocument();
  });

  it("renders formatted shortcut keys inside the navigation section", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    const navigation = getByTestId(TEST_IDS.settings.shortcuts.navigation);
    // The jump-to shortcut renders a mod-key combo; the arrow rows render
    // the literal arrow glyphs. Both prove the rows mounted with real content.
    expect(navigation.textContent ?? "").toContain("K");
    expect(navigation.textContent ?? "").toContain("↓");
    expect(navigation.textContent ?? "").toContain("↑");
  });

  it("renders the git operation key hints", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    const git = getByTestId(TEST_IDS.settings.shortcuts.git);
    expect(git.textContent ?? "").toContain("P");
    expect(git.textContent ?? "").toContain("F");
  });
});
