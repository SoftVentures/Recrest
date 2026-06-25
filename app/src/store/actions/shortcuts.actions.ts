import { createAction } from "@reduxjs/toolkit";

import type { ShortcutCombo, ShortcutId } from "@/lib/constants/shortcuts.constants";

/** Rebind a single shortcut to a new combo (validated by the caller for the
 *  modifier requirement and conflicts before dispatch). */
export const setShortcutOverride = createAction<{ id: ShortcutId; combo: ShortcutCombo }>(
  "shortcuts/setOverride",
);

/** Drop a single shortcut's override, restoring its declarative default. */
export const resetShortcut = createAction<ShortcutId>("shortcuts/reset");

/** Drop every override, restoring all defaults. */
export const resetAllShortcuts = createAction("shortcuts/resetAll");
