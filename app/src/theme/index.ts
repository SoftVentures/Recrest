import { createTheme, responsiveFontSizes } from "@mui/material/styles";

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
  OLED_COLORS,
  type PrimaryColorScheme,
  THEMES,
  type ThemeId,
} from "@/lib/constants/theme.constants";
import { getPrimaryColorScheme, getThemeById } from "@/lib/utils/theme.utils";
import MuiOverrides from "@/theme/overrides";

export interface AccessibilityOptions {
  /** Legacy boolean; superseded by `font` but still honoured as a synonym for "opendyslexic". */
  dyslexiaFont?: boolean;
  primaryColor?: PrimaryColorScheme | null;
  font?: FontSelection;
  fontSize?: FontSizeId;
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

/** Base body-text size per `FontSizeId`. Display-style rows (h1…h6) scale
 *  via MUI's `responsiveFontSizes` from this anchor. */
function baseFontSizeForId(id: FontSizeId): number {
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

const baseTheme = {
  typography: {
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    h1: { fontSize: 60, fontWeight: 700 },
    h2: { fontSize: 48, fontWeight: 700 },
    h3: { fontSize: 34, fontWeight: 700 },
    h4: { fontSize: 24, fontWeight: 700 },
    h5: { fontSize: 20, fontWeight: 600 },
    h6: { fontSize: 16, fontWeight: 600 },
    body1: { fontSize: 14, fontWeight: 400 },
    body2: { fontSize: 13, fontWeight: 400 },
    body3: { fontSize: 12, fontWeight: 400 },
    subtle1: { fontSize: 13, fontWeight: 400 },
    subtle2: { fontSize: 12, fontWeight: 500 },
    overline: { fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" },
    caption: { fontSize: 11, fontWeight: 400 },
  },
  breakpoints: {
    values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 },
  },
  spacing: 8,
  // Single rectangular radius across the app — Cards, Buttons, Menus,
  // Inputs, Dialogs, Popovers, Chips-as-tile all read this. Pills
  // (borderRadius: 100/999) and circles ("50%") opt out explicitly per
  // component when the design intent is a fully rounded shape.
  shape: { borderRadius: 8 },
  components: { ...MuiOverrides },
};

export function getTheme(themeId: ThemeId, opts?: AccessibilityOptions) {
  const meta = getThemeById(themeId);
  const isDark = meta.mode === "dark";
  const { isOled, isGlassy } = meta;

  // `font` is the new source of truth. The legacy `dyslexiaFont` boolean
  // still wins when explicitly set so callers that only flip the toggle
  // (e.g. the keyboard shortcut, the older settings.json on disk) keep
  // working unchanged.
  const explicitFont = opts?.font;
  const dyslexiaFont = opts?.dyslexiaFont ?? false;
  const resolvedFont: FontSelection =
    dyslexiaFont && !explicitFont ? "opendyslexic" : (explicitFont ?? DEFAULT_FONT);
  const fontFamily = fontFamilyForId(resolvedFont);
  const fontSize = baseFontSizeForId(opts?.fontSize ?? DEFAULT_FONT_SIZE);

  const primary = getPrimaryColorScheme(opts?.primaryColor);

  // In dark mode the lighter shade reads cleaner against the dark surfaces —
  // promote `primary.LIGHT` to `palette.primary.main` so every consumer that
  // reaches for the accent automatically picks up the brighter variant.
  const primaryMain = isDark ? primary.LIGHT : primary.MAIN;

  // Surface palette source — OLED overrides dark slots with pure-black variants.
  const C = isOled ? OLED_COLORS : isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const F = isDark ? FORMATTING_COLORS.DARK : FORMATTING_COLORS.LIGHT;

  // Glassy: surfaces become semi-transparent so Tauri vibrancy shows through.
  const surfaceAlpha = (hex: string, a: number) => {
    if (!isGlassy) return hex;
    if (hex.startsWith("#") && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return hex;
  };

  const effects = isGlassy ? EFFECTS_TOKENS.GLASSY : EFFECTS_TOKENS.NONE;

  const theme = createTheme({
    ...baseTheme,
    typography: { ...baseTheme.typography, fontFamily, fontSize },
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
        default: isGlassy ? "transparent" : C.APP_BG,
        paper: isGlassy ? surfaceAlpha(C.SURFACE_1, 0.6) : C.SURFACE_1,
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
          base: isGlassy ? surfaceAlpha(C.SURFACE_1, 0.6) : C.SURFACE_1,
          background: isGlassy ? "transparent" : C.APP_BG,
          content: isGlassy ? surfaceAlpha(C.CANVAS, 0.55) : C.CANVAS,
          backElevation: C.SURFACE_2,
          active: C.SURFACE_HOVER,
          // Sidebar becomes translucent in Glassy so the native acrylic shows
          // through the left nav too; opaque in every other theme.
          dark: isGlassy ? surfaceAlpha(C.SIDEBAR_BG, 0.6) : C.SIDEBAR_BG,
          navigation: isGlassy ? surfaceAlpha(C.SIDEBAR_BG, 0.6) : C.SIDEBAR_BG,
          // Titlebar strip — always opaque (never alpha'd), so the window
          // controls keep a solid backdrop in Glassy instead of bleeding the
          // acrylic through. Matches `background.paper` in the opaque themes.
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

  return responsiveFontSizes(theme);
}

export { THEMES };
export type { ThemeId };
export default getTheme;
