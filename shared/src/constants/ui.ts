export const SIDEBAR_WIDTH = {
  expanded: 240,
  collapsed: 64,
} as const;

export const HEADER_HEIGHT = 56;

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
