/**
 * Single source of truth for all visual design tokens.
 *
 * Values mirror `app/src/styles/tokens.scss` 1:1 — when adjusting a token,
 * update both until Phase 5 removes the SCSS file. New tokens go here only.
 */

export const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;
export type ThemeMode = (typeof THEME)[keyof typeof THEME];

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT_THEME_COLORS — mirrors tokens.scss :root block
// ─────────────────────────────────────────────────────────────────────────────

export const LIGHT_THEME_COLORS = {
  APP_BG: "#fafafa",
  CANVAS: "#ffffff",
  SURFACE: "#ffffff",
  SURFACE_1: "#ffffff",
  SURFACE_2: "#f7f7f8",
  SURFACE_3: "#eeeeef",
  SURFACE_HOVER: "#f2f2f3",
  SIDEBAR_BG: "#f5f5f6",
  BORDER: "#ececee",
  BORDER_STRONG: "#dedee1",
  HAIRLINE: "rgba(17, 17, 22, 0.06)",
  INK_0: "#0b0b0f",
  INK_1: "#22222a",
  INK_2: "#52525b",
  INK_3: "#64646d",
  INK_4: "#747480",
  ACCENT: "#f46a3d",
  ACCENT_WEAK: "#ffe6db",
  ACCENT_INK: "#b13b15",
  BRAND_BG: "#ffffff",
  BRAND_INK: "#0f1115",
  BRAND_BORDER: "#ececee",
  BLUE: "#1e52d4",
  BLUE_WEAK: "#e8f0ff",
  GREEN: "#138438",
  GREEN_WEAK: "#e4f6ea",
  AMBER: "#8f4700",
  AMBER_WEAK: "#fdf1dc",
  RED: "#c71515",
  RED_WEAK: "#fbe9e9",
  PURPLE: "#7c3aed",
  PURPLE_WEAK: "#f0e9ff",
  SHADOW_POP: "0 1px 2px rgba(17, 17, 22, 0.04), 0 12px 32px rgba(17, 17, 22, 0.08)",
  SHADOW_CARD: "0 1px 0 rgba(17, 17, 22, 0.04)",
  SHADOW_ROW_HOVER: "0 1px 0 rgba(17, 17, 22, 0.04), 0 6px 18px rgba(17, 17, 22, 0.06)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DARK_THEME_COLORS — mirrors tokens.scss [data-theme="dark"] block
// ─────────────────────────────────────────────────────────────────────────────

export const DARK_THEME_COLORS = {
  // App background lifted closer to true black (#0b0d12) to match the
  // original mocks — the +6 step we had before made the dark surface
  // read as charcoal rather than the deep slate the design called for.
  APP_BG: "#0b0d12",
  CANVAS: "#15171f",
  SURFACE: "#222530",
  SURFACE_1: "#222530",
  SURFACE_2: "#262935",
  SURFACE_3: "#2f3340",
  SURFACE_HOVER: "#2c2f3c",
  SIDEBAR_BG: "#1a1c23",
  BORDER: "#303445",
  BORDER_STRONG: "#3d4156",
  HAIRLINE: "rgba(255, 255, 255, 0.08)",
  INK_0: "#ffffff",
  INK_1: "#ecedf2",
  INK_2: "#a0a2b2",
  INK_3: "#a3a6b8",
  INK_4: "#8b8ea2",
  ACCENT: "#ff7f4f",
  ACCENT_WEAK: "rgba(255, 127, 79, 0.18)",
  ACCENT_INK: "#ffa888",
  BRAND_BG: "#0f1115",
  BRAND_INK: "#ffffff",
  BRAND_BORDER: "#303445",
  BLUE: "#7ba7ff",
  BLUE_WEAK: "rgba(123, 167, 255, 0.18)",
  GREEN: "#4ae38a",
  GREEN_WEAK: "rgba(74, 227, 138, 0.18)",
  AMBER: "#ffb347",
  AMBER_WEAK: "rgba(255, 179, 71, 0.18)",
  RED: "#ff6b6b",
  RED_WEAK: "rgba(255, 107, 107, 0.18)",
  PURPLE: "#c4a8ff",
  PURPLE_WEAK: "rgba(196, 168, 255, 0.18)",
  SHADOW_POP: "0 1px 2px rgba(0, 0, 0, 0.4), 0 20px 40px rgba(0, 0, 0, 0.5)",
  SHADOW_CARD: "0 0 0 1px rgba(255, 255, 255, 0.02)",
  SHADOW_ROW_HOVER: "0 1px 0 rgba(255, 255, 255, 0.03), 0 6px 18px rgba(0, 0, 0, 0.4)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// OLED_COLORS — pure-black overrides for OLED displays.
// Inherits everything from DARK; only surface/background/border slots change.
// Goal: pixels turn off on OLED panels, not WCAG contrast.
// ─────────────────────────────────────────────────────────────────────────────

export const OLED_COLORS = {
  ...DARK_THEME_COLORS,
  APP_BG: "#000000",
  CANVAS: "#000000",
  SURFACE: "#000000",
  SURFACE_1: "#000000",
  SURFACE_2: "#0a0a0a",
  SURFACE_3: "#141414",
  SURFACE_HOVER: "#1a1a1a",
  SIDEBAR_BG: "#000000",
  BORDER: "#1a1a1a",
  BORDER_STRONG: "#2a2a2a",
  HAIRLINE: "rgba(255, 255, 255, 0.06)",
  BRAND_BG: "#000000",
  BRAND_BORDER: "#1a1a1a",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BASE_THEME_COLORS — mode-independent semantic slots
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_THEME_COLORS = {
  PRIMARY: {
    TERTIARY: "#ffe6db", // matches LIGHT.ACCENT_WEAK as the default accent's faint stop
    LIGHT: "#ff8f6a",
    MAIN: "#f46a3d", // default coral accent (matches LIGHT.ACCENT)
    DARK: "#b13b15", // matches LIGHT.ACCENT_INK
    LINK: "#b13b15",
  },
  SECONDARY: {
    WHITE: "#ffffff",
    LIGHT: "#a0a2b2",
    MAIN: "#52525b",
    DARK: "#22222a",
    BLACK: "#0b0b0f",
  },
  SUCCESS: {
    LIGHT: "#e4f6ea",
    MAIN: "#138438",
    DARK: "#0a5d28",
  },
  WARNING: {
    LIGHT: "#fdf1dc",
    MAIN: "#8f4700",
    DARK: "#5c2e00",
  },
  ERROR: {
    LIGHT: "#fbe9e9",
    MAIN: "#c71515",
    DARK: "#8b0e0e",
  },
  INFO: {
    LIGHT: "#e8f0ff",
    MAIN: "#1e52d4",
    DARK: "#143a99",
  },
  // Divider uses the *stronger* border tone from src-old's design tokens
  // (`--border-strong`). The legacy SCSS reserved this slot for visible
  // 1px rails — table shells, sidebar rail, drawer separators, row
  // dividers — because the lighter `--border` value (#ececee / #303445)
  // disappears on the canvas/surface backgrounds we use everywhere. The
  // dark value (#3d4156) gives a clearly readable hairline on the
  // sidebar (#1a1c23) and surface (#222530) backgrounds; the light value
  // (#dedee1) does the same against #fafafa.
  DIVIDER: {
    LIGHT: "#dedee1",
    DARK: "#3d4156",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY_COLOR_SCHEMES — accent picker variants (from tokens.scss $accents-*)
// ─────────────────────────────────────────────────────────────────────────────

export const PRIMARY_COLOR_SCHEMES = {
  default: {
    TERTIARY: "#ffe6db",
    LIGHT: "#ff8f6a",
    MAIN: "#f46a3d",
    DARK: "#b13b15",
    LINK: "#b13b15",
  },
  blue: {
    TERTIARY: "#e2ecff",
    LIGHT: "#7ba7ff",
    MAIN: "#3d7bff",
    DARK: "#1a42b8",
    LINK: "#1a42b8",
  },
  green: {
    TERTIARY: "#d9f7ed",
    LIGHT: "#4ae38a",
    MAIN: "#10b981",
    DARK: "#0a7a56",
    LINK: "#0a7a56",
  },
  purple: {
    TERTIARY: "#ece3ff",
    LIGHT: "#c4a8ff",
    MAIN: "#8b5cf6",
    DARK: "#5b21b6",
    LINK: "#5b21b6",
  },
  pink: {
    TERTIARY: "#fde0ef",
    LIGHT: "#ff78b9",
    MAIN: "#ec4899",
    DARK: "#a3185e",
    LINK: "#a3185e",
  },
  amber: {
    TERTIARY: "#fdecc9",
    LIGHT: "#ffb347",
    MAIN: "#f59e0b",
    DARK: "#9a5c04",
    LINK: "#9a5c04",
  },
} as const;
export type PrimaryColorScheme = keyof typeof PRIMARY_COLOR_SCHEMES;
export const DEFAULT_PRIMARY_COLOR: PrimaryColorScheme = "default";

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING_COLORS — code, mention, blockquote, table, link
// Per-mode slots so getTheme can pick the right block.
// ─────────────────────────────────────────────────────────────────────────────

export const FORMATTING_COLORS = {
  LIGHT: {
    CODE_INLINE_TEXT: "#b13b15",
    CODE_INLINE_BG: "#f7f7f8",
    CODE_BLOCK_BG: "#eeeeef",
    MENTION_TEXT: "#1e52d4",
    MENTION_BG: "#e8f0ff",
    BLOCKQUOTE_BORDER: "#dedee1",
    BLOCKQUOTE_BG: "#f7f7f8",
    TABLE_HEADER_BG: "#f5f5f6",
    TABLE_BORDER: "#ececee",
    LINK_TEXT: "#1e52d4",
  },
  DARK: {
    CODE_INLINE_TEXT: "#ffa888",
    CODE_INLINE_BG: "#262935",
    CODE_BLOCK_BG: "#1b1d25",
    MENTION_TEXT: "#7ba7ff",
    MENTION_BG: "rgba(123, 167, 255, 0.18)",
    BLOCKQUOTE_BORDER: "#3d4156",
    BLOCKQUOTE_BG: "#222530",
    TABLE_HEADER_BG: "#1a1c23",
    TABLE_BORDER: "#303445",
    LINK_TEXT: "#7ba7ff",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EFFECTS_TOKENS — non-color theme effects (blur, ambient shadow)
// ─────────────────────────────────────────────────────────────────────────────

export const EFFECTS_TOKENS = {
  NONE: {
    backdropBlur: "blur(0)",
    backdropSaturate: "100%",
  },
  GLASSY: {
    backdropBlur: "blur(20px) saturate(180%)",
    backdropSaturate: "180%",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// APP THEMES — atomic selection presented to users
// ─────────────────────────────────────────────────────────────────────────────

export interface AppTheme {
  id: string;
  label: string;
  mode: ThemeMode;
  /** OLED-optimised — pure #000 surfaces so OLED pixels can switch off.
   *  Not an accessibility (WCAG-contrast) setting. */
  isOled: boolean;
  /** Transparent app window — relies on the OS vibrancy layer underneath. */
  isGlassy: boolean;
}

export const ThemeId = {
  LIGHT: "light",
  DARK: "dark",
  OLED: "oled",
  GLASSY: "glassy",
} as const;
export type ThemeId = (typeof ThemeId)[keyof typeof ThemeId];

export const THEMES = [
  { id: ThemeId.LIGHT, label: "Light", mode: "light", isOled: false, isGlassy: false },
  { id: ThemeId.DARK, label: "Dark", mode: "dark", isOled: false, isGlassy: false },
  { id: ThemeId.OLED, label: "OLED Black", mode: "dark", isOled: true, isGlassy: false },
  { id: ThemeId.GLASSY, label: "Glassy", mode: "dark", isOled: false, isGlassy: true },
] as const satisfies readonly AppTheme[];

export const DEFAULT_THEME_ID: ThemeId = ThemeId.LIGHT;

/**
 * Root-element class applied for one paint cycle while the renderer reconciles
 * the OS-truth theme value at boot. The matching CSS rule in `globals.css`
 * suppresses all transitions while the class is present so the surface flip
 * from the anti-flash painted value to the OS-truth value doesn't show a
 * highlighted/cross-faded frame.
 */
export const THEME_NO_TRANSITIONS_CLASS = "recrest-no-transitions";
