import { describe, expect, it } from "vitest";

import { SHORTCUT_ID } from "@/lib/constants/shortcuts.constants";
import {
  resetAllShortcuts,
  resetShortcut,
  setShortcutOverride,
} from "@/store/actions/shortcuts.actions";
import { initialShortcutsState, shortcutsReducer } from "@/store/reducers/shortcutsReducer";

describe("shortcutsReducer", () => {
  it("stores a single override", () => {
    const next = shortcutsReducer(
      initialShortcutsState,
      setShortcutOverride({ id: SHORTCUT_ID.SEARCH, combo: { mod: true, shift: true, key: "p" } }),
    );
    expect(next.overrides[SHORTCUT_ID.SEARCH]).toEqual({ mod: true, shift: true, key: "p" });
  });

  it("drops a single override on reset", () => {
    const withOverride = shortcutsReducer(
      initialShortcutsState,
      setShortcutOverride({ id: SHORTCUT_ID.SEARCH, combo: { mod: true, key: "p" } }),
    );
    const next = shortcutsReducer(withOverride, resetShortcut(SHORTCUT_ID.SEARCH));
    expect(next.overrides[SHORTCUT_ID.SEARCH]).toBeUndefined();
  });

  it("clears every override on resetAll", () => {
    let state = shortcutsReducer(
      initialShortcutsState,
      setShortcutOverride({ id: SHORTCUT_ID.SEARCH, combo: { mod: true, key: "p" } }),
    );
    state = shortcutsReducer(
      state,
      setShortcutOverride({ id: SHORTCUT_ID.TOGGLE_SIDEBAR, combo: { mod: true, key: "l" } }),
    );
    const next = shortcutsReducer(state, resetAllShortcuts());
    expect(Object.keys(next.overrides)).toHaveLength(0);
  });
});
