import { describe, expect, it } from "vitest";

import { SHORTCUT_ID, type ShortcutOverrides } from "@/lib/constants/shortcuts.constants";
import {
  comboEquals,
  comboFromEvent,
  comboHasModifier,
  findComboConflict,
  resolveShortcuts,
} from "@/lib/utils/shortcuts.utils";

describe("shortcuts.utils", () => {
  describe("comboEquals", () => {
    it("treats absent flags as false", () => {
      expect(comboEquals({ key: "k", mod: true }, { key: "k", mod: true, shift: false })).toBe(
        true,
      );
    });

    it("is case-insensitive on the key", () => {
      expect(comboEquals({ key: "K", mod: true }, { key: "k", mod: true })).toBe(true);
    });

    it("distinguishes different modifiers", () => {
      expect(comboEquals({ key: "f", mod: true }, { key: "f", mod: true, shift: true })).toBe(
        false,
      );
    });
  });

  describe("comboHasModifier", () => {
    it("requires the primary modifier", () => {
      expect(comboHasModifier({ key: "k", mod: true })).toBe(true);
      expect(comboHasModifier({ key: "k", shift: true })).toBe(false);
      expect(comboHasModifier({ key: "k" })).toBe(false);
    });
  });

  describe("resolveShortcuts", () => {
    it("returns defaults when there are no overrides", () => {
      const resolved = resolveShortcuts({});
      const search = resolved.find((s) => s.id === SHORTCUT_ID.SEARCH);
      expect(search?.combo).toEqual({ mod: true, key: "k" });
    });

    it("merges an override onto its shortcut only", () => {
      const overrides: ShortcutOverrides = {
        [SHORTCUT_ID.SEARCH]: { mod: true, shift: true, key: "p" },
      };
      const resolved = resolveShortcuts(overrides);
      expect(resolved.find((s) => s.id === SHORTCUT_ID.SEARCH)?.combo).toEqual({
        mod: true,
        shift: true,
        key: "p",
      });
      // A non-overridden shortcut keeps its default.
      expect(resolved.find((s) => s.id === SHORTCUT_ID.TOGGLE_SIDEBAR)?.combo).toEqual({
        mod: true,
        key: "b",
      });
    });
  });

  describe("findComboConflict", () => {
    it("flags a combo already bound to another shortcut", () => {
      const resolved = resolveShortcuts({});
      // ⌘1 is NAV_DASHBOARD — binding it to SEARCH conflicts.
      const conflict = findComboConflict(resolved, SHORTCUT_ID.SEARCH, { mod: true, key: "1" });
      expect(conflict?.id).toBe(SHORTCUT_ID.NAV_DASHBOARD);
    });

    it("ignores the shortcut's own current combo", () => {
      const resolved = resolveShortcuts({});
      expect(findComboConflict(resolved, SHORTCUT_ID.SEARCH, { mod: true, key: "k" })).toBeNull();
    });

    it("returns null for a free combo", () => {
      const resolved = resolveShortcuts({});
      expect(
        findComboConflict(resolved, SHORTCUT_ID.SEARCH, { mod: true, shift: true, key: "j" }),
      ).toBeNull();
    });
  });

  describe("comboFromEvent", () => {
    it("builds a combo from a modifier + key", () => {
      const e = new KeyboardEvent("keydown", { key: "J", ctrlKey: true, shiftKey: true });
      expect(comboFromEvent(e)).toEqual({ mod: true, shift: true, alt: false, key: "j" });
    });

    it("returns null for a lone modifier press", () => {
      expect(comboFromEvent(new KeyboardEvent("keydown", { key: "Control" }))).toBeNull();
      expect(comboFromEvent(new KeyboardEvent("keydown", { key: "Shift" }))).toBeNull();
    });
  });
});
