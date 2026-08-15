import { useMemo } from "react";

import type { Theme as MuiTheme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";

import type { PartialTheme as NivoTheme } from "@nivo/theming";

/**
 * Single source of truth for chart chrome: derives the Nivo theme from the
 * active MUI theme so dark/light and brand palette stay in sync without a
 * second hand-maintained color table. Series colors stay in
 * `lib/charts/palette.ts` (CHART_PALETTE) — this module only owns axes,
 * grid, labels, legends, and tooltip chrome.
 *
 * The return type is `@nivo/theming`'s `PartialTheme` (what every Nivo chart's
 * `theme` prop accepts); `@nivo/core` re-exports neither a `Theme` nor a
 * `PartialTheme`, it only consumes the latter internally.
 */
export function buildNivoTheme(mui: MuiTheme): NivoTheme {
  // Chart chrome is SVG/canvas text, so it cannot inherit the rem scaling the
  // rest of the app gets from the root font size — the container would grow
  // while the axis labels stayed frozen at 11px. `rem` is not an option even
  // though `PartialTheme` types `fontSize` as `string | number`: Nivo's canvas
  // renderers build the font shorthand as `${fontSize}px` (see
  // `@nivo/text::setCanvasFont`), which turns a rem string into garbage. So the
  // design px are multiplied by the active interface scale here instead.
  const px = (designPx: number) => designPx * mui.uiScale;
  const tick = { fill: mui.palette.text.secondary, fontSize: px(11) };
  return {
    text: {
      fontFamily: mui.typography.fontFamily,
      fontSize: px(11),
      fill: mui.palette.text.secondary,
    },
    axis: {
      ticks: { text: tick, line: { stroke: mui.palette.divider, strokeWidth: 1 } },
      legend: { text: { ...tick, fontSize: px(12) } },
      domain: { line: { stroke: mui.palette.divider, strokeWidth: 1 } },
    },
    grid: { line: { stroke: mui.palette.divider, strokeWidth: 1 } },
    legends: { text: tick },
    labels: { text: { ...tick, fill: mui.palette.text.primary } },
    crosshair: { line: { stroke: mui.palette.text.secondary, strokeWidth: 1 } },
    tooltip: {
      container: {
        background: mui.palette.background.paper,
        color: mui.palette.text.primary,
        fontSize: px(12),
        borderRadius: 8,
        boxShadow: mui.shadows[4],
      },
    },
  };
}

/** Memoized hook variant for components. */
export function useNivoTheme(): NivoTheme {
  const mui = useTheme();
  return useMemo(() => buildNivoTheme(mui), [mui]);
}
