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
  // `Theme["uiScale"]` is non-optional but `ThemeOptions["uiScale"]` is not, so
  // a `createTheme()` that omits it — every chart test, and any component test
  // rendering a chart outside `ThemeWrapper` — yields `undefined` at runtime
  // while the type still claims `number`. Without this fallback every size below
  // is `NaN` and the canvas renderer's `${fontSize}px` emits the literal
  // `"NaNpx"`, which silently drops all chart text.
  // Deliberately `uiScale` only, not the text scale: the "Font size" setting
  // moves reading text, and chart chrome (axis ticks, legends, tooltip) is
  // labelling on a fixed plot area, not prose. Letting it grow 31 % at `xl`
  // would eat the gutter without making the chart more legible.
  const px = (designPx: number) => designPx * (mui.uiScale ?? 1);
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

/** Nivo's `margin` — the gutter the axis labels are drawn into. */
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Scale a chart margin by the active interface scale.
 *
 * The gutter is canvas/SVG geometry, so — exactly like the font sizes in
 * `buildNivoTheme` — it cannot inherit the rem scaling. Leaving it at the design
 * px while the tick text grows with `--ui-scale` means the labels outgrow the
 * space reserved for them and clip: at scale 1.5 an 11px label renders at 16.5px
 * inside a gutter measured for 11px.
 */
export function scaleChartMargin(margin: ChartMargin, uiScale: number | undefined): ChartMargin {
  const scale = uiScale ?? 1;
  return {
    top: margin.top * scale,
    right: margin.right * scale,
    bottom: margin.bottom * scale,
    left: margin.left * scale,
  };
}

/** Hook variant of {@link scaleChartMargin} for chart components. */
export function useChartMargin(margin: ChartMargin): ChartMargin {
  const { uiScale } = useTheme();
  const { top, right, bottom, left } = margin;
  return useMemo(
    () => scaleChartMargin({ top, right, bottom, left }, uiScale),
    [top, right, bottom, left, uiScale],
  );
}
