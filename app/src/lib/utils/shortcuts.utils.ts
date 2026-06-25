/**
 * Pure helpers for the editable-shortcut layer: merging user overrides onto the
 * declarative defaults, comparing combos, detecting conflicts, and reading a
 * combo back out of a DOM keyboard event while the user is recording one.
 *
 * Kept framework-free (no React, no Redux) so both the binding hook and the
 * Settings UI can share the same logic and it stays trivially unit-testable.
 */
import {
  SHORTCUTS,
  type ShortcutCombo,
  type ShortcutDef,
  type ShortcutId,
  type ShortcutOverrides,
} from "@/lib/constants/shortcuts.constants";

/** Keyboard keys that are modifiers themselves — pressing one alone never
 *  completes a combo, so the recorder ignores them and waits for a real key. */
const MODIFIER_KEYS = new Set(["control", "meta", "shift", "alt", "os", "hyper", "altgraph"]);

/** Structural equality for two combos, treating absent flags as `false` so
 *  `{ key: "k", mod: true }` and `{ key: "k", mod: true, shift: false }` match. */
export function comboEquals(a: ShortcutCombo, b: ShortcutCombo): boolean {
  return (
    !!a.mod === !!b.mod &&
    !!a.shift === !!b.shift &&
    !!a.alt === !!b.alt &&
    a.key.toLowerCase() === b.key.toLowerCase()
  );
}

/**
 * Whether a combo is safe to bind globally. Every binding must carry the
 * primary modifier (⌘/Ctrl) so it can never swallow plain text entry — a bare
 * letter or a Shift+letter would fire while the user types into a field. This
 * mirrors the invariant the default `SHORTCUTS` already satisfy.
 */
export function comboHasModifier(combo: ShortcutCombo): boolean {
  return !!combo.mod;
}

/** Merge user overrides onto the declarative defaults. Returns a fresh list so
 *  callers can memoize on the overrides reference. */
export function resolveShortcuts(overrides: ShortcutOverrides): ShortcutDef[] {
  return SHORTCUTS.map((def) => {
    const override = overrides[def.id];
    return override ? { ...def, combo: override } : def;
  });
}

/**
 * Find a shortcut (other than `selfId`) already bound to `combo` in the given
 * resolved list. Used to reject a recording that would shadow another binding.
 * Returns the conflicting definition, or `null` when the combo is free.
 */
export function findComboConflict(
  resolved: readonly ShortcutDef[],
  selfId: ShortcutId,
  combo: ShortcutCombo,
): ShortcutDef | null {
  return resolved.find((def) => def.id !== selfId && comboEquals(def.combo, combo)) ?? null;
}

/**
 * Build a `ShortcutCombo` from a keydown event captured while recording. Returns
 * `null` when the event is a lone modifier press (so the recorder keeps waiting
 * for the user to add a real key). `key` is normalized to lowercase to match
 * the `KeyboardEvent.key` comparison in the binding hook.
 */
export function comboFromEvent(e: KeyboardEvent): ShortcutCombo | null {
  const key = e.key.toLowerCase();
  if (MODIFIER_KEYS.has(key)) return null;
  return {
    mod: e.metaKey || e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    key,
  };
}
