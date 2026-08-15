import { createTheme } from "@mui/material/styles";

import {
  CUSTOM_FONT_PREFIX,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  type FontSelection,
  type FontSizeId,
} from "@recrest/shared";

import {
  BASE_THEME_COLORS,
  DARK_THEME_COLORS,
  EFFECTS_TOKENS,
  FORMATTING_COLORS,
  LIGHT_THEME_COLORS,
  type PrimaryColorScheme,
  THEMES,
  type ThemeId,
} from "@/lib/constants/theme.constants";
import { getPrimaryColorScheme, getThemeById } from "@/lib/utils/theme.utils";
import MuiOverrides from "@/theme/overrides";
import {
  DEFAULT_UI_SCALE,
  ROOT_FONT_SIZE_PX,
  baseFontSizeForId,
  clampUiScale,
  pxToRem,
  scaledBreakpointValues,
  textScaleForFontSize,
} from "@/theme/scale";

export interface AccessibilityOptions {
  /** Legacy boolean; superseded by `font` but still honoured as a synonym for "opendyslexic". */
  dyslexiaFont?: boolean;
  primaryColor?: PrimaryColorScheme | null;
  font?: FontSelection;
  fontSize?: FontSizeId;
  /** Interface scale (0.8 … 1.5). Drives `--ui-scale` → root font size, and
   *  therefore every `rem` length. The theme only needs it to scale the
   *  breakpoints (media queries can't read a CSS variable) and to expose it to
   *  `styled()` blocks via `theme.uiScale`. */
  uiScale?: number;
  /** When true, the orthogonal translucency effect is active. The theme nulls
   *  out the canvas-level `background.default` so the OS vibrancy layer can
   *  composite through; styled surfaces (Sidebar, Cards) keep their opaque
   *  backgrounds and provide visible UI structure on top. */
  translucent?: boolean;
}

/**
 * Map a `FontId` (from `@recrest/shared`) to the actual CSS `font-family`
 * stack. Each entry falls back to system defaults so a missing webfont
 * still yields a legible UI rather than the browser's serif default.
 */
export function fontFamilyForId(id: FontSelection): string {
  if (id.startsWith(CUSTOM_FONT_PREFIX)) {
    const family = id.slice(CUSTOM_FONT_PREFIX.length);
    return `"${family}", "Helvetica Neue", system-ui, sans-serif`;
  }
  switch (id) {
    case "inter":
      return 'Inter, "Helvetica Neue", system-ui, sans-serif';
    case "manrope":
      return "Manrope, system-ui, sans-serif";
    case "plex":
      return '"IBM Plex Sans", system-ui, sans-serif';
    case "geist":
      return "Geist, system-ui, sans-serif";
    case "system":
      return '-apple-system, "Segoe UI", system-ui, sans-serif';
    case "opendyslexic":
      return "OpenDyslexic, Inter, system-ui, sans-serif";
    case "jetbrains-mono":
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "fira-code":
      return '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "geist-mono":
      return '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "plex-mono":
      return '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "sf-mono":
      return 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
    default:
      return 'Inter, "Helvetica Neue", system-ui, sans-serif';
  }
}

/** The type scale in design pixels, authored at `fontSize: "md"`. Rendered
 *  sizes are `pxToRem(px * textScale)`, so at `md` (textScale 1, root 16 px)
 *  every variant reproduces the number below exactly. */
const TYPOGRAPHY_PX = {
  h1: { px: 60, fontWeight: 700 },
  h2: { px: 48, fontWeight: 700 },
  h3: { px: 34, fontWeight: 700 },
  h4: { px: 24, fontWeight: 700 },
  h5: { px: 20, fontWeight: 600 },
  h6: { px: 16, fontWeight: 600 },
  body1: { px: 14, fontWeight: 400 },
  body2: { px: 13, fontWeight: 400 },
  body3: { px: 12, fontWeight: 400 },
  subtle1: { px: 13, fontWeight: 400 },
  subtle2: { px: 12, fontWeight: 500 },
  overline: { px: 10, fontWeight: 600, letterSpacing: "0.04em" },
  caption: { px: 11, fontWeight: 400 },
} as const;

type TypographyVariantKey = keyof typeof TYPOGRAPHY_PX;

function buildTypography(fontFamily: string, fontSizeId: FontSizeId) {
  const textScale = textScaleForFontSize(fontSizeId);
  const variants = {} as Record<TypographyVariantKey, Record<string, unknown>>;
  for (const key of Object.keys(TYPOGRAPHY_PX) as TypographyVariantKey[]) {
    const { px, ...rest } = TYPOGRAPHY_PX[key];
    variants[key] = { ...rest, fontSize: pxToRem(px * textScale) };
  }
  return {
    fontFamily,
    // `htmlFontSize` is what MUI divides by internally. It was never set
    // before, so MUI silently assumed 16 while the app behaved as if the root
    // were 13 — pin it to the value `globals.css` actually uses.
    htmlFontSize: ROOT_FONT_SIZE_PX,
    // Stays a plain number (px): MUI derives its internal `pxToRem`
    // coefficient (`fontSize / 14`) from it, and a string would break that.
    // Rendered body text comes from the `body*` variants above, not from here.
    fontSize: baseFontSizeForId(fontSizeId),
    ...variants,
  };
}

const baseTheme = {
  // 8-px grid expressed in rem, so `theme.spacing(2)` is `1rem` — 16 px at
  // scale 1, 20 px at scale 1.25. Leaving spacing in px while text moved to
  // rem is precisely how text bursts out of its container.
  spacing: (factor: number) => pxToRem(8 * factor),
  // Single rectangular radius across the app — Cards, Buttons, Menus,
  // Inputs, Dialogs, Popovers, Chips-as-tile all read this. Pills
  // (borderRadius: 100/999) and circles ("50%") opt out explicitly per
  // component when the design intent is a fully rounded shape.
  //
  // Deliberately still a unitless number (px): several MUI components do
  // arithmetic on `shape.borderRadius`, and a corner radius is a decorative
  // constant rather than a layout dimension — it should not grow with the
  // interface scale.
  //
  // The exception is a radius *derived* from a scaled dimension — `size / 2`
  // for a circle, `height / 2` for a pill. That one is geometry, not
  // decoration: it has to ride `--ui-scale` with the box it rounds, or the
  // shape breaks above scale 1. Those go through `pxToRem` (see
  // `GeneralAvatar`, `GeneralSwitchInput`, `GeneralLinearLoader`).
  shape: { borderRadius: 8 },
  components: { ...MuiOverrides },
};

export function getTheme(themeId: ThemeId, opts?: AccessibilityOptions) {
  const meta = getThemeById(themeId);
  const isDark = meta.mode === "dark";

  // `font` is the new source of truth. The legacy `dyslexiaFont` boolean
  // still wins when explicitly set so callers that only flip the toggle
  // (e.g. the keyboard shortcut, the older settings.json on disk) keep
  // working unchanged.
  const explicitFont = opts?.font;
  const dyslexiaFont = opts?.dyslexiaFont ?? false;
  const resolvedFont: FontSelection =
    dyslexiaFont && !explicitFont ? "opendyslexic" : (explicitFont ?? DEFAULT_FONT);
  const fontFamily = fontFamilyForId(resolvedFont);
  const fontSizeId = opts?.fontSize ?? DEFAULT_FONT_SIZE;
  // Range-clamped only — see the note in `ThemeWrapper`: breakpoints have to
  // be derived from the scale that is actually applied, snapping included or
  // not, or media queries would fire at a width the layout never has.
  const uiScale = clampUiScale(opts?.uiScale ?? DEFAULT_UI_SCALE);

  const primary = getPrimaryColorScheme(opts?.primaryColor);

  // In dark mode the lighter shade reads cleaner against the dark surfaces —
  // promote `primary.LIGHT` to `palette.primary.main` so every consumer that
  // reaches for the accent automatically picks up the brighter variant.
  const primaryMain = isDark ? primary.LIGHT : primary.MAIN;

  // Surface palette source — picked by the active theme mode.
  const C = isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const F = isDark ? FORMATTING_COLORS.DARK : FORMATTING_COLORS.LIGHT;

  // Translucency is orthogonal to theme now — surface alpha-blending happens
  // at runtime in the renderer (driven by `appearance.translucency.enabled`).
  // Themes themselves stay opaque, so background blocks read solid hex
  // values; the OS-level vibrancy effect provides the see-through under any
  // theme.
  const effects = EFFECTS_TOKENS.NONE;

  const theme = createTheme({
    ...baseTheme,
    typography: buildTypography(fontFamily, fontSizeId),
    // Breakpoints have to be rebuilt per scale — see `scaledBreakpointValues`
    // for why `unit: "em"` cannot do this job.
    breakpoints: { values: scaledBreakpointValues(uiScale) },
    // Exposed on the theme so `styled()` blocks can build scale-aware raw
    // media queries via `mediaDown(px, theme.uiScale)`.
    uiScale,
    effects: { backdropBlur: effects.backdropBlur, backdropSaturate: effects.backdropSaturate },
    palette: {
      mode: meta.mode,
      primary: {
        tertiary: primary.TERTIARY,
        light: primary.LIGHT,
        main: primaryMain,
        dark: primary.DARK,
        link: primary.LINK,
      },
      secondary: {
        white: BASE_THEME_COLORS.SECONDARY.WHITE,
        light: BASE_THEME_COLORS.SECONDARY.LIGHT,
        main: BASE_THEME_COLORS.SECONDARY.MAIN,
        dark: BASE_THEME_COLORS.SECONDARY.DARK,
        black: BASE_THEME_COLORS.SECONDARY.BLACK,
      },
      success: {
        light: BASE_THEME_COLORS.SUCCESS.LIGHT,
        main: BASE_THEME_COLORS.SUCCESS.MAIN,
        dark: BASE_THEME_COLORS.SUCCESS.DARK,
      },
      warning: {
        light: BASE_THEME_COLORS.WARNING.LIGHT,
        main: BASE_THEME_COLORS.WARNING.MAIN,
        dark: BASE_THEME_COLORS.WARNING.DARK,
      },
      error: {
        light: BASE_THEME_COLORS.ERROR.LIGHT,
        main: BASE_THEME_COLORS.ERROR.MAIN,
        dark: BASE_THEME_COLORS.ERROR.DARK,
      },
      info: {
        light: BASE_THEME_COLORS.INFO.LIGHT,
        main: BASE_THEME_COLORS.INFO.MAIN,
        dark: BASE_THEME_COLORS.INFO.DARK,
      },
      background: {
        // Canvas: transparent when translucency is on so the OS vibrancy
        // material composites through the main content area. Styled surfaces
        // (Sidebar, Cards, Header) keep their opaque palette and provide UI
        // structure on top of the glass.
        default: opts?.translucent ? "transparent" : C.APP_BG,
        paper: C.SURFACE_1,
      },
      text: {
        default: C.INK_1,
        primary: C.INK_1,
        secondary: C.INK_2,
        link: primary.LINK,
        information: C.INK_3,
        informationLight: C.INK_4,
        contrast: isDark ? C.INK_0 : "#ffffff",
        hover: C.INK_0,
        system: C.INK_0,
        warning: BASE_THEME_COLORS.WARNING.DARK,
        disabled: C.INK_4,
      },
      icon: {
        primary: primaryMain,
        secondary: C.INK_2,
        contrast: C.INK_0,
        information: C.INK_3,
        disabled: C.INK_4,
        alert: BASE_THEME_COLORS.ERROR.MAIN,
      },
      border: {
        default: C.BORDER,
        primary: primaryMain,
        hover: C.BORDER_STRONG,
        separator: C.HAIRLINE,
        inactive: C.BORDER,
        error: BASE_THEME_COLORS.ERROR.MAIN,
      },
      surface: {
        button: {
          primary: primaryMain,
          hover: primary.DARK,
          secondary: isDark ? C.SURFACE_2 : primary.TERTIARY,
          hoverLight: C.SURFACE_HOVER,
          disabled: C.SURFACE_3,
          focused: C.SURFACE_3,
          // Brand CTA: always-dark surface (mirrors src-old `.r-btn.primary`).
          // In light mode use LIGHT_THEME_COLORS.INK_0 (#0b0b0f); in dark mode
          // pin to the same family (#0f1115) so the CTA stays anchored.
          cta: isDark ? "#0f1115" : LIGHT_THEME_COLORS.INK_0,
          ctaHover: isDark ? "#1a1d24" : LIGHT_THEME_COLORS.INK_1,
          ctaContrast: "#ffffff",
        },
        interface: {
          base: C.SURFACE_1,
          background: C.APP_BG,
          content: C.CANVAS,
          backElevation: C.SURFACE_2,
          active: C.SURFACE_HOVER,
          dark: C.SIDEBAR_BG,
          navigation: C.SIDEBAR_BG,
          // Titlebar strip — always opaque (never alpha'd) so the window
          // controls keep a solid backdrop even under translucency, instead
          // of bleeding the acrylic through. Matches `background.paper`.
          chrome: C.SURFACE_1,
          overlay: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(17, 17, 22, 0.4)",
          disabled: C.SURFACE_3,
          boxShadow: C.SHADOW_CARD,
        },
        alert: {
          success: BASE_THEME_COLORS.SUCCESS.MAIN,
          warning: BASE_THEME_COLORS.WARNING.MAIN,
          error: BASE_THEME_COLORS.ERROR.MAIN,
          info: BASE_THEME_COLORS.INFO.MAIN,
        },
      },
      formatting: {
        code: {
          inlineText: F.CODE_INLINE_TEXT,
          inlineBackground: F.CODE_INLINE_BG,
          blockBackground: F.CODE_BLOCK_BG,
        },
        mention: {
          text: F.MENTION_TEXT,
          background: F.MENTION_BG,
        },
        blockquote: {
          border: F.BLOCKQUOTE_BORDER,
          background: F.BLOCKQUOTE_BG,
        },
        table: {
          headerBackground: F.TABLE_HEADER_BG,
          borderColor: F.TABLE_BORDER,
        },
        link: {
          text: F.LINK_TEXT,
        },
      },
      divider: isDark ? BASE_THEME_COLORS.DIVIDER.DARK : BASE_THEME_COLORS.DIVIDER.LIGHT,
    },
  });

  // `responsiveFontSizes()` used to wrap this return. It is gone on purpose:
  // it was fed unitless px numbers, so its `remFontSize <= 1` guard skipped
  // every body/caption variant and it only ever rewrote `h4` — downwards, to
  // 1.25rem. Now that the scale is genuinely rem-based it would instead start
  // shrinking every heading at viewport widths nobody designed for, while the
  // user-facing scaling knob (`uiScale`) already covers the real use case.
  return theme;
}

export { THEMES };
export type { ThemeId };
export default getTheme;
