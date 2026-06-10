export const SIDEBAR_WIDTH = {
  expanded: 208,
  collapsed: 48,
} as const;

export const HEADER_HEIGHT = 52;

export const TITLEBAR_HEIGHT = 32;

export const ACCENTS = ["coral", "blue", "green", "purple", "pink", "amber"] as const;
export type AccentId = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: AccentId = "coral";

export const FONTS = [
  // Sans
  "inter",
  "manrope",
  "plex",
  "geist",
  "system",
  "opendyslexic",
  // Mono / code
  "jetbrains-mono",
  "fira-code",
  "geist-mono",
  "plex-mono",
  "sf-mono",
] as const;
export type FontId = (typeof FONTS)[number];
export const DEFAULT_FONT: FontId = "inter";
/** Default monospace font for code surfaces (ligature-capable). */
export const DEFAULT_CODE_FONT: FontId = "jetbrains-mono";

/** Prefix marking a font picker value as a user-uploaded custom font. The
 *  text after the prefix is the registered CSS family name (see
 *  `commands/fonts.rs` + the runtime `@font-face` registration). Built-in
 *  fonts use their bare `FontId`; custom ones use `custom:<family>`. */
export const CUSTOM_FONT_PREFIX = "custom:";

/** A font picker value: either a built-in {@link FontId} or a custom uploaded
 *  family (`custom:<family>`). The `string & NonNullable<unknown>` arm keeps
 *  `FontId` literal autocomplete while still accepting arbitrary custom
 *  family strings. */
export type FontSelection = FontId | (string & NonNullable<unknown>);

/** Sans vs mono grouping — drives the optgroup split in the font picker. */
export const SANS_FONT_IDS = [
  "inter",
  "manrope",
  "plex",
  "geist",
  "system",
  "opendyslexic",
] as const;
export const MONO_FONT_IDS = [
  "jetbrains-mono",
  "fira-code",
  "geist-mono",
  "plex-mono",
  "sf-mono",
] as const;

/** Human-readable labels for the font picker. Paired with CSS `data-font` rules in tokens.css. */
export const FONT_LABELS: Record<FontId, string> = {
  inter: "Inter",
  manrope: "Manrope",
  plex: "IBM Plex Sans",
  geist: "Geist",
  system: "System UI",
  opendyslexic: "OpenDyslexic",
  "jetbrains-mono": "JetBrains Mono",
  "fira-code": "Fira Code",
  "geist-mono": "Geist Mono",
  "plex-mono": "IBM Plex Mono",
  "sf-mono": "SF Mono",
};

export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type FontSizeId = (typeof FONT_SIZES)[number];
export const DEFAULT_FONT_SIZE: FontSizeId = "md";

/** Code-ligature rendering mode for code surfaces. `off` disables ligatures,
 *  `standard` enables the common programming ligatures (`=>`, `!=`, `>=`, …),
 *  `stylistic` additionally turns on the font's stylistic sets (`ss01`–`ss20`)
 *  for alternative glyph shapes. Independent of the chosen code font. */
export const LIGATURE_MODES = ["off", "standard", "stylistic"] as const;
export type LigatureMode = (typeof LIGATURE_MODES)[number];
export const DEFAULT_LIGATURE_MODE: LigatureMode = "standard";

/** Human-readable labels for the ligature picker. */
export const LIGATURE_MODE_LABELS: Record<LigatureMode, string> = {
  off: "Off",
  standard: "Standard",
  stylistic: "Stylistic",
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const ANIMATIONS = {
  sidebarMs: 180,
  fadeMs: 120,
  popoverMs: 90,
} as const;

export const SEARCH_HOTKEY = {
  mac: "Cmd+K",
  other: "Ctrl+K",
} as const;
