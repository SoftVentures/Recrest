import { type Theme, alpha } from "@mui/material/styles";

/** Translucency mode nulls `palette.background.default` to the string
 *  "transparent" so the OS vibrancy composites through the app canvas. Any
 *  surface that wants to react to that mode checks it here rather than
 *  duplicating the string comparison. */
export function isTranslucent(theme: Theme): boolean {
  return theme.palette.background.default === "transparent";
}

/** Background for a floating overlay (modal paper, command palette): a readable
 *  frosted-glass surface in translucency mode — a tint so the blurred
 *  background shows through as glass, with a strong backdrop blur carrying
 *  legibility — and the solid canvas colour otherwise. Spread into a styled
 *  block.
 *
 *  `opacity` tunes the tint: sparse overlays (confirm dialogs) read fine at the
 *  low default, but dense ones (the command palette's scrolling list) need a
 *  higher tint so text doesn't fight the busy backdrop behind it. */
export function frostedPanel(theme: Theme, opacity = 0.45) {
  return isTranslucent(theme)
    ? {
        backgroundColor: alpha(theme.palette.background.paper, opacity),
        backdropFilter: "blur(40px) saturate(160%)",
        WebkitBackdropFilter: "blur(40px) saturate(160%)",
      }
    : { backgroundColor: theme.palette.background.default };
}

/** Background for a surface that must stay opaque even in translucency mode —
 *  sticky headers, side panels, footers, the bits that mask content behind
 *  them. `background.default` is "transparent" there, so fall back to the
 *  opaque paper surface. */
export function opaqueSurfaceBg(theme: Theme): string {
  return isTranslucent(theme) ? theme.palette.background.paper : theme.palette.background.default;
}
