import { type PointerEvent, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import type { BucketUnit } from "@/lib/activity/rangeBuckets";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export interface ActivityChartProps {
  agg: number[];
  maxDay: number;
  title: string;
  meta: string;
  /** Granularity of each bar so labels read "yesterday" vs "last week" vs
   *  "last month" — the bars are bucketed adaptively by the selected range. */
  unit: BucketUnit;
}

/** Short axis suffix per bucket unit. */
const UNIT_SHORT: Record<BucketUnit, string> = { day: "d", week: "w", month: "mo" };

/**
 * Pointer position drives which column is "active" — the hover region extends
 * above the bar's visible footprint into empty card padding, which feels
 * larger than per-bar :hover would.
 */
export function ActivityChart({ agg, maxDay, title, meta, unit }: ActivityChartProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Label a bar by how many buckets back it sits, in the bucket's own unit.
  const spanLabel = (ago: number): string => {
    if (ago === 0) return t(`dash.activity.span.${unit}.now`);
    if (ago === 1) return t(`dash.activity.span.${unit}.prev`);
    return t(`dash.activity.span.${unit}.ago`, { count: ago });
  };

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    if (!chart) return;
    const rect = chart.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const col = Math.floor((x / rect.width) * agg.length);
    const clamped = Math.max(0, Math.min(agg.length - 1, col));
    setHovered(clamped);
  };

  const handleLeave = () => setHovered(null);

  return (
    <CardActivity onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <CardHead>
        <CardTitle component="h3">{title}</CardTitle>
        <CardMeta component="span" variant="caption">
          {meta}
        </CardMeta>
      </CardHead>
      <Chart ref={chartRef} columns={agg.length}>
        {agg.map((v, i) => {
          const ago = agg.length - 1 - i;
          const dayLabel = spanLabel(ago);
          const isActive = hovered === i;
          return (
            <BarColumn key={i}>
              {/* Tooltip anchors to the bar itself (not the full-height column),
                  so it sits just above each bar's top edge and rides up/down
                  with the bar's height as the pointer sweeps across. */}
              <GeneralTooltip
                open={isActive}
                title={
                  <TooltipBody>
                    <TooltipMain>{t("dash.activity.commits", { count: v })}</TooltipMain>
                    <TooltipSub>{dayLabel}</TooltipSub>
                  </TooltipBody>
                }
                placement="top"
                slotProps={{
                  popper: {
                    modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
                  },
                }}
              >
                <Bar active={isActive} heightPct={(v / maxDay) * 100} index={i} />
              </GeneralTooltip>
            </BarColumn>
          );
        })}
      </Chart>
      <ChartAxis data-testid={TEST_IDS.dashboard.activityAxis}>
        <Box component="span">{spanLabel(agg.length - 1)}</Box>
        <Box component="span">
          {Math.round(agg.length / 2)}
          {UNIT_SHORT[unit]}
        </Box>
        <Box component="span">{spanLabel(0)}</Box>
      </ChartAxis>
    </CardActivity>
  );
}

export default ActivityChart;

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: pxToRems(14, 16),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(10),
})) as typeof Box;

const CardActivity = styled(Card)({
  gridColumn: "1 / -1",
});

const CardHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(12),
}) as typeof Box;

const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
})) as typeof Typography;

const CardMeta = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;

const Chart = styled(Box, {
  shouldForwardProp: (prop) => prop !== "columns",
})<{ columns: number }>(({ columns }) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap: pxToRem(6),
  height: pxToRem(200),
  alignItems: "end",
  padding: pxToRems(4, 0, 0),
}));

const BarColumn = styled(Box)({
  height: "100%",
  display: "flex",
  alignItems: "end",
  cursor: "pointer",
}) as typeof Box;

const barGrow = keyframes`
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
`;

const Bar = styled(Box, {
  shouldForwardProp: (prop) => prop !== "heightPct" && prop !== "index" && prop !== "active",
})<{ heightPct: number; index: number; active: boolean }>(({ theme, heightPct, index, active }) => {
  const p = theme.palette.primary.main;
  return {
    width: "100%",
    // Floor so a bucket with a few commits still reads as a real bar, not "0".
    minHeight: heightPct > 0 ? pxToRem(7) : 0,
    // Height reflects the actual value and stays put on hover — hovering only
    // brightens the gradient + adds a glow, it never inflates the bar.
    height: `${heightPct}%`,
    borderRadius: "6px 6px 0 0",
    border: `1px solid color-mix(in srgb, ${p} ${active ? 90 : 45}%, transparent)`,
    borderBottom: 0,
    // Vertical primary-colour gradient: brighter at the top, fading toward the
    // base, so the bar reads with depth instead of a flat block.
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${p} ${
      active ? 100 : 70
    }%, transparent) 0%, color-mix(in srgb, ${p} ${active ? 55 : 22}%, transparent) 100%)`,
    boxShadow: active
      ? `0 0 0 1px color-mix(in srgb, ${p} 55%, transparent), 0 6px 18px -6px color-mix(in srgb, ${p} 70%, transparent)`
      : "none",
    transformOrigin: "bottom",
    animation: `${barGrow} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    animationDelay: `${index * 28}ms`,
    transition: "background-image 0.14s ease, border-color 0.14s ease, box-shadow 0.16s ease",
    'html[data-reduced-motion="true"] &': {
      animation: "none",
    },
  };
});

const ChartAxis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: fontPxToRem(10),
  color: theme.palette.text.information,
  padding: pxToRems(0, 4),
})) as typeof Box;

const TooltipBody = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
}) as typeof Box;

const TooltipMain = styled(Box)({
  fontWeight: 600,
}) as typeof Box;

const TooltipSub = styled(Box)({
  fontSize: fontPxToRem(10),
  opacity: 0.7,
}) as typeof Box;
