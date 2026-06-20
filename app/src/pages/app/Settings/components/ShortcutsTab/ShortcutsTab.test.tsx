import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { ShortcutsSection } from "@/pages/app/Settings/components/ShortcutsTab";
import { renderWithProviders } from "@/test/utils";

describe("ShortcutsSection", () => {
  it("renders the navigation and actions shortcut sections", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    expect(getByTestId(TEST_IDS.settings.shortcuts.navigation)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.settings.shortcuts.actions)).toBeInTheDocument();
  });

  it("renders navigation combos (view digit + settings comma)", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    const navigation = getByTestId(TEST_IDS.settings.shortcuts.navigation);
    // Platform-agnostic: both "⌘1" and "Ctrl+1" contain "1".
    expect(navigation.textContent ?? "").toContain("1");
    expect(navigation.textContent ?? "").toContain(",");
  });

  it("renders action combos (search, find, sidebar)", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    const actions = getByTestId(TEST_IDS.settings.shortcuts.actions);
    expect(actions.textContent ?? "").toContain("K");
    expect(actions.textContent ?? "").toContain("F");
    expect(actions.textContent ?? "").toContain("B");
  });
});
