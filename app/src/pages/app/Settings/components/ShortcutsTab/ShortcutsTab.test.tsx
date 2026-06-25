import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SHORTCUT_ID } from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { ShortcutsSection } from "@/pages/app/Settings/components/ShortcutsTab";
import { makeTestStore, renderWithProviders } from "@/test/utils";

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

  it("renders action combos (search, sidebar)", () => {
    const { getByTestId } = renderWithProviders(<ShortcutsSection />);

    const actions = getByTestId(TEST_IDS.settings.shortcuts.actions);
    expect(actions.textContent ?? "").toContain("K");
    expect(actions.textContent ?? "").toContain("B");
  });

  it("records a new combo and surfaces a reset affordance", () => {
    const { getByTestId, queryByTestId, store } = renderWithProviders(<ShortcutsSection />);

    fireEvent.click(getByTestId(TEST_IDS.settings.shortcuts.edit(SHORTCUT_ID.SEARCH)));
    expect(
      getByTestId(TEST_IDS.settings.shortcuts.recording(SHORTCUT_ID.SEARCH)),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "j", ctrlKey: true });

    expect(store.getState().shortcuts.overrides[SHORTCUT_ID.SEARCH]).toEqual({
      mod: true,
      shift: false,
      alt: false,
      key: "j",
    });
    expect(queryByTestId(TEST_IDS.settings.shortcuts.recording(SHORTCUT_ID.SEARCH))).toBeNull();
    expect(getByTestId(TEST_IDS.settings.shortcuts.reset(SHORTCUT_ID.SEARCH))).toBeInTheDocument();
  });

  it("rejects a combo already bound to another shortcut", () => {
    const { getByTestId, store } = renderWithProviders(<ShortcutsSection />);

    fireEvent.click(getByTestId(TEST_IDS.settings.shortcuts.edit(SHORTCUT_ID.SEARCH)));
    // Ctrl/⌘+1 is already NAV_DASHBOARD.
    fireEvent.keyDown(window, { key: "1", ctrlKey: true });

    expect(store.getState().shortcuts.overrides[SHORTCUT_ID.SEARCH]).toBeUndefined();
    // Still recording — the conflict didn't commit or cancel.
    expect(
      getByTestId(TEST_IDS.settings.shortcuts.recording(SHORTCUT_ID.SEARCH)),
    ).toBeInTheDocument();
  });

  it("resets an overridden shortcut back to its default", () => {
    const store = makeTestStore({
      shortcuts: { overrides: { [SHORTCUT_ID.SEARCH]: { mod: true, key: "j" } } },
    });
    const { getByTestId, queryByTestId } = renderWithProviders(<ShortcutsSection />, { store });

    fireEvent.click(getByTestId(TEST_IDS.settings.shortcuts.reset(SHORTCUT_ID.SEARCH)));

    expect(store.getState().shortcuts.overrides[SHORTCUT_ID.SEARCH]).toBeUndefined();
    expect(queryByTestId(TEST_IDS.settings.shortcuts.reset(SHORTCUT_ID.SEARCH))).toBeNull();
  });
});
