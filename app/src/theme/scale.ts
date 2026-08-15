/**
 * Scaling primitives — the single source of truth for how a design pixel
 * becomes a rendered length.
 *
 * ## The model
 *
 * `globals.css` sets `html { font-size: calc(16px * var(--ui-scale)) }`. Every
 * length that should grow with the user's interface scale is therefore
 * expressed in `rem`, and `--ui-scale` (written by `ThemeWrapper` from
 * `settings.uiScale`) is the only knob that moves them. There is no `zoom`
 * anywhere: `zoom` detached the layout viewport from `window.innerWidth`,
 * which blinded every media query and left body-portalled overlays unscaled.
 *
 * Two independent user controls feed this:
 *
 * - **UI scale** (`settings.uiScale`, 0.8 … 1.5) → `--ui-scale` → root font
 *   size → *everything* expressed in rem.
 * - **Font size** (`settings.fontSize`, sm|md|lg|xl) → a text-only multiplier
 *   applied to the MUI typography variants. Chrome (padding, icon boxes, fixed
 *   widths) stays put.
 *
 * ## Invariant
 *
 * At `uiScale === 1` and `fontSize === "md"` every helper here must reproduce
 * the pre-migration pixel values exactly — `pxToRem(13)` is `0.8125rem`, which
 * is 13 px against a 16 px root. The visual-regression baselines in
 * `tests/src/e2e/app/14-visual.spec.ts` pin that.
 *
 * ## Why a pure function and not `theme.typography.pxToRem`
 *
 * MUI's built-in `theme.typography.pxToRem` multiplies by
 * `theme.typography.fontSize / 14` (0.93 here), so it does **not** round-trip
 * design pixels. It is also only reachable from a `({ theme }) => …` callback,
 * while most `styled()` blocks in this app are plain object literals. The
 * helper below is theme-free on purpose so a mechanical codemod can drop it
 * into any style object.
 */
import type { FontSizeId } from "@recrest/shared";

/** Root font size the whole design system is authored against. `--ui-scale`
 *  multiplies this in `globals.css`; nothing else may change it. */
export const ROOT_FONT_SIZE_PX = 16;

export const CSS_VAR_UI_SCALE = "--ui-scale";
export const CSS_VAR_TEXT_SCALE = "--text-scale";
export const CSS_VAR_APP_HEADER_HEIGHT = "--recrest-app-header-height";
export const CSS_VAR_APP_CHROME_BOTTOM = "--recrest-app-chrome-bottom";

/**
 * Convert a design pixel value to `rem`.
 *
 * ```ts
 * const Row = styled(Box)({ fontSize: pxToRem(13), padding: pxToRem(8) });
 * ```
 *
 * Use for anything that should grow with the interface scale: font sizes,
 * padding/margin/gap, width/height and their min/max variants, absolute
 * offsets (top/right/bottom/left), flex-basis, icon box sizes.
 *
 * Do **not** use for border widths (a hairline must stay a hairline),
 * unitless line heights, `em` letter-spacing, z-index, percentages, or
 * anything measured against native OS geometry (titlebar heights, caption
 * button boxes).
 */
export function pxToRem(px: number): string {
  return `${px / ROOT_FONT_SIZE_PX}rem`;
}

/**
 * Shorthand helper for multi-value CSS properties.
 * `pxToRems(8, 10)` → `"0.5rem 0.625rem"` (was `"8px 10px"`).
 */
export function pxToRems(...values: number[]): string {
  return values.map(pxToRem).join(" ");
}

/**
 * Convert a design pixel value to a **font size**.
 *
 * ```ts
 * const Label = styled(Box)({ fontSize: fontPxToRem(13) });
 * ```
 *
 * Same rem base as {@link pxToRem}, plus the `--text-scale` multiplier that
 * the "Font size" setting writes. That is what makes the two settings
 * genuinely orthogonal:
 *
 * - `--ui-scale` (root font size) moves *everything*, including this.
 * - `--text-scale` moves *only* values produced by this helper.
 *
 * Without the second variable, "Font size" would only reach the handful of
 * nodes that read a MUI typography variant — measured before this migration,
 * 2 of 106 text nodes responded to sm → xl, which is why the control felt
 * like a UI zoom instead of a text size.
 *
 * At `md` the multiplier is exactly 1, so `fontPxToRem(13)` renders 13 px.
 *
 * ## Containment policy — mandatory wherever this helper is used
 *
 * Because `--text-scale` reaches up to 17/13 ≈ 1.31 while the surrounding
 * chrome only rides `--ui-scale`, text sized with this helper can outgrow a box
 * that was measured with {@link pxToRem}. Three rules keep that from clipping:
 *
 * 1. **`lineHeight` next to a `fontPxToRem` font size is unitless.** Never
 *    `lineHeight: pxToRem(N)` — that pins the line box to `--ui-scale` while
 *    the glyphs ride `--text-scale`, so at `xl` the box ends up *smaller* than
 *    its own text (e.g. `fontPxToRem(24)` renders 31.4 px inside a 30 px line
 *    box). A unitless ratio scales with the element's own font size for free;
 *    `fontPxToRem(N)` is the fallback when a specific px rhythm matters.
 *    Write the ratio as the original design pair — `lineHeight: 30 / 24` — so
 *    the intent stays readable and the value stays exact at `md`.
 * 2. **A box sized around `fontPxToRem` text uses `minHeight`, not `height`.**
 *    A fixed `height` cannot absorb the extra 31 % and clips or overflows.
 * 3. **Glyphs that are chrome use {@link pxToRem}, not this helper.** An avatar
 *    initial or a rank badge is sized *off its own box* (`size * 0.5`), so it
 *    has to move with the box, not with the reading text — otherwise a circle
 *    is forced into an oval at `xl`.
 */
export function fontPxToRem(px: number): string {
  return `calc(${px / ROOT_FONT_SIZE_PX}rem * var(${CSS_VAR_TEXT_SCALE}, 1))`;
}

/** Inverse of {@link pxToRem}, for tests and JS-side arithmetic. */
export function remToPx(rem: number): number {
  return rem * ROOT_FONT_SIZE_PX;
}

/* ────────────────────────────────────────────────────────────────────────
   UI scale
   ──────────────────────────────────────────────────────────────────────── */

export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.5;
export const UI_SCALE_STEP = 0.05;
export const DEFAULT_UI_SCALE = 1;

/**
 * Clamp + snap an arbitrary scale into the supported range.
 *
 * Every scale — user input (slider drag, zoom hotkey), backend hydration, and
 * the legacy `fontSize` → `uiScale` migration — goes through this one function,
 * so `settings.uiScale` is only ever a multiple of {@link UI_SCALE_STEP}. A
 * value between two steps would park the settings slider's thumb between its
 * detents, and the first arrow key would then jump to the nearest one; snapping
 * on the way in costs ≤ 2 % of rendered size, which nobody can see, and keeps
 * the control honest. Rounding also keeps floating-point drift from
 * accumulating over repeated `Cmd +` presses.
 */
export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_UI_SCALE;
  const snapped = Math.round(value / UI_SCALE_STEP) * UI_SCALE_STEP;
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, snapped));
  // Snapping introduces 1e-16 noise (0.05 is not binary-exact); round to the
  // two decimals the step implies so the value serialises cleanly.
  return Math.round(clamped * 100) / 100;
}

/** Next / previous scale step, used by the zoom hotkeys. */
export function stepUiScale(value: number, direction: 1 | -1): number {
  return clampUiScale(value + direction * UI_SCALE_STEP);
}

/* ────────────────────────────────────────────────────────────────────────
   Text scale
   ──────────────────────────────────────────────────────────────────────── */

/** The size the typography scale is authored against — `md`. */
export const BASE_TEXT_SIZE_PX = 13;

/** Body-text size per `FontSizeId`. */
export function baseFontSizeForId(id: FontSizeId): number {
  switch (id) {
    case "sm":
      return 12;
    case "md":
      return 13;
    case "lg":
      return 15;
    case "xl":
      return 17;
  }
}

/** Multiplier applied to every typography variant so the whole type scale
 *  moves with the user's font-size choice. Exactly `1` at `md`, which is what
 *  keeps the visual baselines valid. */
export function textScaleForFontSize(id: FontSizeId): number {
  return baseFontSizeForId(id) / BASE_TEXT_SIZE_PX;
}

/* ────────────────────────────────────────────────────────────────────────
   Breakpoints
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Breakpoint values in *design* pixels — the width the layout gets at
 * `uiScale === 1`.
 *
 * `xxl` is new: the old scale topped out at `xl: 1280`, so nothing in the app
 * could react to a 2560-wide display.
 */
export const BASE_BREAKPOINT_PX = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1600,
} as const;

export type BreakpointKey = keyof typeof BASE_BREAKPOINT_PX;

/**
 * Breakpoints have to be multiplied by the active UI scale, and they have to
 * stay in **px**.
 *
 * Why not `em` (the obvious "make it scale itself" answer): relative units
 * inside a media query resolve against the *initial* font size, never against
 * a `font-size` declared on `:root`. Measured in Chromium at 1440 px with
 * `html { font-size: 20px }`, `(max-width: 80em)` evaluates to `false` — the
 * query still means 1280 px. `em` media queries only track the browser's own
 * default-font-size preference, which a packaged webview never changes.
 * (Container queries *do* resolve `em` against the container and would work,
 * but that needs a containment wrapper per query.)
 *
 * Multiplying the px values by `uiScale` is exact instead: at scale 1.25 a
 * 1440 px window has 1152 design pixels of room, and `xl` fires at
 * 1280 × 1.25 = 1600 px — i.e. exactly when the design width drops below 1280.
 */
export function scaledBreakpointValues(uiScale: number): Record<BreakpointKey, number> {
  return {
    xs: 0,
    sm: BASE_BREAKPOINT_PX.sm * uiScale,
    md: BASE_BREAKPOINT_PX.md * uiScale,
    lg: BASE_BREAKPOINT_PX.lg * uiScale,
    xl: BASE_BREAKPOINT_PX.xl * uiScale,
    xxl: BASE_BREAKPOINT_PX.xxl * uiScale,
  };
}

/** `@media` block for "design width is at most `designPx`". Pass
 *  `theme.uiScale` as the second argument from inside a `styled()` callback. */
export function mediaDown(designPx: number, uiScale: number): string {
  return `@media (max-width:${designPx * uiScale}px)`;
}

/** `@media` block for "design width is at least `designPx`". */
export function mediaUp(designPx: number, uiScale: number): string {
  return `@media (min-width:${designPx * uiScale}px)`;
}

/** Media-query string (no `@media` prefix) for `window.matchMedia`, so JS
 *  layout hooks react to the same effective width the CSS does. */
export function matchMediaDown(designPx: number, uiScale: number): string {
  return `(max-width:${designPx * uiScale}px)`;
}

/* ────────────────────────────────────────────────────────────────────────
   Layout constants shared between CSS and JS
   ──────────────────────────────────────────────────────────────────────── */

/** App header height in design px. Mirrored as `--recrest-app-header-height`
 *  (in rem) so CSS and JS agree without either re-deriving it. */
export const APP_HEADER_HEIGHT_PX = 64;
