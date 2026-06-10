/**
 * MUI module augmentation — extends the default `Theme`, `Palette`, and
 * `TypographyVariants` types so the rich token surface in `theme.constants.ts`
 * stays type-safe when consumed via `theme.palette.surface.button.primary`,
 * `theme.effects.backdropBlur`, etc.
 */
import type { CSSProperties } from "react";

import "@mui/material/Typography";
import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    icon: PaletteIcon;
    border: PaletteBorder;
    surface: PaletteSurface;
    formatting: PaletteFormatting;
  }
  interface PaletteOptions {
    icon?: Partial<PaletteIcon>;
    border?: Partial<PaletteBorder>;
    surface?: Partial<PaletteSurface>;
    formatting?: Partial<PaletteFormatting>;
  }

  interface PaletteColor {
    tertiary?: string;
    link?: string;
    white?: string;
    black?: string;
  }
  interface SimplePaletteColorOptions {
    tertiary?: string;
    link?: string;
    white?: string;
    black?: string;
  }

  interface TypeText {
    default?: string;
    link?: string;
    information?: string;
    informationLight?: string;
    contrast?: string;
    hover?: string;
    system?: string;
    warning?: string;
  }

  interface TypographyVariants {
    subtle1: CSSProperties;
    subtle2: CSSProperties;
    body3: CSSProperties;
  }
  interface TypographyVariantsOptions {
    subtle1?: CSSProperties;
    subtle2?: CSSProperties;
    body3?: CSSProperties;
  }

  interface Theme {
    effects: ThemeEffects;
  }
  interface ThemeOptions {
    effects?: Partial<ThemeEffects>;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    subtle1: true;
    subtle2: true;
    body3: true;
  }
}

export interface ThemeEffects {
  backdropBlur: string;
  backdropSaturate: string;
}

export interface PaletteIcon {
  primary: string;
  secondary: string;
  contrast: string;
  information: string;
  disabled: string;
  alert: string;
}

export interface PaletteBorder {
  default: string;
  primary: string;
  hover: string;
  separator: string;
  inactive: string;
  error: string;
}

export interface PaletteSurfaceButton {
  primary: string;
  hover: string;
  secondary: string;
  hoverLight: string;
  disabled: string;
  focused: string;
  /**
   * Brand CTA — the "Add Repository" style: pinned-dark surface even in dark
   * mode so the call-to-action stays visually anchored. Mirrors `.r-btn.primary`
   * from src-old's tokens.scss (light: `--ink-0`, dark: hardcoded `#0f1115`).
   */
  cta: string;
  /** Hover variant for `cta`. */
  ctaHover: string;
  /** Foreground (label/icon) for `cta`. */
  ctaContrast: string;
}

export interface PaletteSurfaceInterface {
  base: string;
  background: string;
  content: string;
  backElevation: string;
  active: string;
  dark: string;
  navigation: string;
  /** Window chrome (custom titlebar) surface. Stays fully opaque even in the
   *  Glassy theme so the OS window controls sit on a solid strip rather than
   *  letting the native acrylic/vibrancy bleed through them. */
  chrome: string;
  overlay: string;
  disabled: string;
  boxShadow: string;
}

export interface PaletteSurfaceAlert {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface PaletteSurface {
  button: PaletteSurfaceButton;
  interface: PaletteSurfaceInterface;
  alert: PaletteSurfaceAlert;
}

export interface PaletteFormattingCode {
  inlineText: string;
  inlineBackground: string;
  blockBackground: string;
}

export interface PaletteFormattingMention {
  text: string;
  background: string;
}

export interface PaletteFormattingBlockquote {
  border: string;
  background: string;
}

export interface PaletteFormattingTable {
  headerBackground: string;
  borderColor: string;
}

export interface PaletteFormattingLink {
  text: string;
}

export interface PaletteFormatting {
  code: PaletteFormattingCode;
  mention: PaletteFormattingMention;
  blockquote: PaletteFormattingBlockquote;
  table: PaletteFormattingTable;
  link: PaletteFormattingLink;
}
