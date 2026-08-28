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
  // Darkened from #747480: at 4.31:1 against SURFACE_2 (#f7f7f8) the muted-text
  // slot missed WCAG AA for normal text (the 10.5px bold MR "draft" badge).
  // #6d6d78 keeps the same hue and stays visibly lighter than INK_3 while
  // clearing 4.5:1 (4.77:1 on SURFACE_2, 5.03:1 on white).
  INK_4: "#6d6d78",
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
  // Lightened from #8b8ea2, the dark-mode twin of the LIGHT.INK_4 fix above:
  // at 4.47:1 against SURFACE_2 (#262935) it missed AA for the 10.5px bold MR
  // "draft" badge, which paints INK_4 on `surface.interface.backElevation`.
  // #9295a8 keeps the hue (hsl 232) and stays clearly dimmer than INK_3
  // (L 61.6 vs 68.0) while clearing 4.5:1 (4.88:1 on SURFACE_2, 5.15:1 on
  // SURFACE, 6.56:1 on APP_BG).
  INK_4: "#9295a8",
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

/**
 * Backdrop-effect tokens. Translucency is an orthogonal toggle now (any theme
 * can be translucent), so `TRANSLUCENT` replaces the old `GLASSY` token and
 * lights up whenever `appearance.translucency.enabled` is true regardless of
 * `themeId`.
 */
export const EFFECTS_TOKENS = {
  NONE: {
    backdropBlur: "blur(0)",
    backdropSaturate: "100%",
  },
  TRANSLUCENT: {
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
}

export const ThemeId = {
  LIGHT: "light",
  DARK: "dark",
} as const;
export type ThemeId = (typeof ThemeId)[keyof typeof ThemeId];

export const THEMES = [
  { id: ThemeId.LIGHT, label: "Light", mode: "light" },
  { id: ThemeId.DARK, label: "Dark", mode: "dark" },
] as const satisfies readonly AppTheme[];

export const DEFAULT_THEME_ID: ThemeId = ThemeId.LIGHT;

/** Default transparency slider value (0..100, higher = more see-through).
 *  50 = balanced default. Mirrors `default_translucency_intensity` on the
 *  Rust side — keep in lock-step. */
export const DEFAULT_TRANSLUCENCY_INTENSITY = 50;

/** Default backdrop-blur slider value (0..100 → mapped to 0..30 px in CSS).
 *  30 starts the effect at a noticeable but not overwhelming level. Mirrors
 *  `default_blur_intensity` on the Rust side. */
export const DEFAULT_BLUR_INTENSITY = 30;

/** Maximum backdrop-filter blur in CSS pixels at slider = 100. Mirror this
 *  constant in CSS via `--translucency-blur-px` set from `ThemeWrapper`. */
export const MAX_BLUR_PX = 30;

/**
 * Default translucency state — orthogonal to theme. Mirrors
 * `TranslucencySettings::default()` on the Rust side: off by default;
 * intensity + blur tuned so the effect is clearly visible the first time
 * the user flips it on.
 */
export const DEFAULT_TRANSLUCENCY = {
  enabled: false,
  intensity: DEFAULT_TRANSLUCENCY_INTENSITY,
  blurIntensity: DEFAULT_BLUR_INTENSITY,
} as const;

/** HTML attribute carrying the resolved theme mode (`light` | `dark`). Read
 *  by non-MUI CSS selectors, the E2E theme spec, and the anti-flash inline
 *  script in `index.html` (which is the documented exception that mirrors
 *  this literal because it runs before any module loads). */
export const THEME_ATTRIBUTE = "data-theme";

/** HTML attribute carrying the user's specific theme id (granular —
 *  distinguishes e.g. `dark` vs. future variants from the high-level mode
 *  in `THEME_ATTRIBUTE`). */
export const THEME_ID_ATTRIBUTE = "data-theme-id";

/** matchMedia query for the OS dark-mode preference. Single source of truth
 *  for every renderer-side `matchMedia` call that reads system appearance. */
export const THEME_MODE_QUERY = "(prefers-color-scheme: dark)";

/**
 * Root-element class applied for one paint cycle while the renderer reconciles
 * the OS-truth theme value at boot. The matching CSS rule in `globals.css`
 * suppresses all transitions while the class is present so the surface flip
 * from the anti-flash painted value to the OS-truth value doesn't show a
 * highlighted/cross-faded frame.
 */
export const THEME_NO_TRANSITIONS_CLASS = "recrest-no-transitions";
