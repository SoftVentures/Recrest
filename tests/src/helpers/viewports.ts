/**
 * Named viewport presets for the responsive-sweep specs. The values are
 * chosen so at least one breakpoint from the landing-page CSS (720, 800,
 * 860, 960, 1100 px) sits in each interval — that way the sweep exercises
 * both sides of every media query.
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 812, label: "mobile" },
  small: { width: 560, height: 800, label: "small" },
  tablet: { width: 768, height: 1024, label: "tablet" },
  laptop: { width: 1024, height: 768, label: "laptop" },
  desktop: { width: 1440, height: 900, label: "desktop" },
  wide: { width: 1920, height: 1080, label: "wide" },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

export const VIEWPORT_LIST = Object.values(VIEWPORTS);
