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
  const tick = { fill: mui.palette.text.secondary, fontSize: 11 };
  return {
    text: {
      fontFamily: mui.typography.fontFamily,
      fontSize: 11,
      fill: mui.palette.text.secondary,
    },
    axis: {
      ticks: { text: tick, line: { stroke: mui.palette.divider, strokeWidth: 1 } },
      legend: { text: { ...tick, fontSize: 12 } },
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
        fontSize: 12,
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
