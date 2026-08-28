/**
 * One-shot `fontSize` → `uiScale` migration.
 *
 * Before the rem-scaling rework the "Font size" setting drove a CSS `zoom` on
 * `#root`, i.e. it was a full interface zoom. It now only moves the typography
 * scale, and the interface scale is its own setting (`uiScale`, default 1).
 * Upgrading users who had picked `lg` or `xl` would therefore see their whole
 * UI shrink without having changed anything, so on the first load after the
 * update `uiScale` is seeded with the zoom their `fontSize` used to imply.
 *
 * ## Why the "already migrated" bit lives here and not on the backend
 *
 * The backend cannot answer "did the user ever set `uiScale`?". In
 * `app/src-tauri/src/config/settings.rs` the field is
 * `#[serde(default = "default_ui_scale")] pub ui_scale: f32` with
 * `default_ui_scale() -> 1.0`, so a `settings.json` that never mentioned
 * `uiScale` and one that stores an explicit `1.0` deserialise to the exact same
 * payload. An `Option<f32>` there would make the distinction free; until the
 * Rust side grows one, the marker is renderer state persisted in
 * `localStorage`, hydrated into Redux at store construction (same pattern as
 * `resolveBootTheme()`) and flipped by any explicit `setUiScale`.
 *
 * Two deliberate consequences of that approximation:
 * - A stored scale is only ever replaced while it still *is* the default, so a
 *   deliberate non-default choice survives even if the marker is lost.
 * - A user who deliberately picks exactly 1.0 *and* loses the marker (wiped
 *   app storage) gets migrated one more time.
 */
import type { Middleware } from "@reduxjs/toolkit";

import type { FontSizeId } from "@recrest/shared";

import { StorageKey } from "@/lib/constants/storage.constants";
import { loadSettings, saveSettings, setUiScale } from "@/store/actions/settings.actions";
import type { RootState } from "@/store/rootState";
import { DEFAULT_UI_SCALE, clampUiScale } from "@/theme/scale";

/** Interface zoom the legacy `scaleForSize()` in `ThemeWrapper` applied per
 *  font-size token, verbatim. `sm` and `lg` are not multiples of the slider
 *  step, so the caller snaps them; unknown tokens fall back to "no change". */
export function legacyZoomForFontSize(id: FontSizeId | string): number {
  switch (id) {
    case "sm":
      return 0.94;
    case "md":
      return 1;
    case "lg":
      return 1.12;
    case "xl":
      return 1.25;
    default:
      return DEFAULT_UI_SCALE;
  }
}

/**
 * Resolve the interface scale to hydrate from a backend payload.
 *
 * Returns the stored scale once the migration has run, or when the stored scale
 * is already something other than the default (that can only come from an
 * explicit user choice, so it outranks anything we could derive).
 *
 * The derived zoom is snapped to `UI_SCALE_STEP` like every other scale, so
 * legacy `sm` (0.94) lands on 0.95 and `lg` (1.12) on 1.10. Reproducing the old
 * zoom to the percent is not worth an off-step value: 2 % of rendered size is
 * invisible, a settings slider whose thumb sits between two detents is not.
 */
export function resolveHydratedUiScale(args: {
  storedUiScale: number;
  fontSize: FontSizeId | string;
  alreadyMigrated: boolean;
}): number {
  const stored = clampUiScale(args.storedUiScale);
  if (args.alreadyMigrated || stored !== DEFAULT_UI_SCALE) return stored;
  return clampUiScale(legacyZoomForFontSize(args.fontSize));
}

/** Read the persisted "migration already ran" marker. Missing / unreadable
 *  storage reads as "not yet migrated" — the migration is a no-op for the
 *  default `md` font size, so re-running it costs nothing there. */
export function loadUiScaleMigrated(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(StorageKey.UI_SCALE_MIGRATED) === "true";
  } catch {
    return false;
  }
}

function persistUiScaleMigrated(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(StorageKey.UI_SCALE_MIGRATED, "true");
  } catch {
    // Quota / private-mode failures are non-fatal — worst case the migration
    // is re-evaluated next boot, and it only ever touches a default scale.
  }
}

/**
 * Persists the migration marker once the reducer flips it, and mirrors a
 * migrated scale back to `settings.json`. Without that write the next launch
 * would read `uiScale: 1` from the backend with the marker already set, and the
 * UI would shrink after all — one launch later than before.
 *
 * Persisting an explicit `setUiScale` is `settingsBackendSync`'s job; only the
 * marker is handled for it here.
 */
export const uiScaleMigrationMiddleware: Middleware = (store) => (next) => (action) => {
  const hydrates = loadSettings.fulfilled.match(action) || saveSettings.fulfilled.match(action);
  if (!hydrates && !setUiScale.match(action)) return next(action);

  const before = (store.getState() as RootState).settings;
  const result = next(action);
  const after = (store.getState() as RootState).settings;
  // Only the transition matters: once the marker is set, this is dead weight.
  if (before.uiScaleMigrated || !after.uiScaleMigrated) return result;

  if (hydrates && after.uiScale !== before.uiScale) {
    // `Middleware`'s dispatch is typed for plain actions only; thunks are
    // valid at runtime, so cast once here (same as `settingsBackendSync`).
    const dispatch = store.dispatch as unknown as (a: unknown) => PromiseLike<unknown>;
    // The marker is only remembered once the migrated scale is safely stored:
    // if that write fails, the next launch has to derive it again instead of
    // booting into the shrunken UI this migration exists to prevent. Deriving
    // it twice is harmless — the input (`fontSize`) has not moved.
    void Promise.resolve(dispatch(saveSettings({ uiScale: after.uiScale }))).then((settled) => {
      if (saveSettings.fulfilled.match(settled)) persistUiScaleMigrated();
    });
    return result;
  }
  persistUiScaleMigrated();
  return result;
};
