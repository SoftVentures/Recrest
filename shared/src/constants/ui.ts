export const SIDEBAR_WIDTH = {
  expanded: 208,
  collapsed: 48,
} as const;

export const HEADER_HEIGHT = 52;

export const TITLEBAR_HEIGHT = 32;

export const ACCENTS = ["coral", "blue", "green", "purple", "pink", "amber"] as const;
export type AccentId = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: AccentId = "coral";

export const FONTS = ["inter", "manrope", "plex", "system", "opendyslexic"] as const;
export type FontId = (typeof FONTS)[number];
export const DEFAULT_FONT: FontId = "inter";

/** Human-readable labels for the font picker. Paired with CSS `data-font` rules in tokens.css. */
export const FONT_LABELS: Record<FontId, string> = {
  inter: "Inter",
  manrope: "Manrope",
  plex: "IBM Plex Sans",
  system: "System UI",
  opendyslexic: "OpenDyslexic",
};

export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type FontSizeId = (typeof FONT_SIZES)[number];
export const DEFAULT_FONT_SIZE: FontSizeId = "md";

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
