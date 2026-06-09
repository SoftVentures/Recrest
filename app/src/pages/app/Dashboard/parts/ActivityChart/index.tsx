import { type PointerEvent, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import type { BucketUnit } from "@/lib/activity/rangeBuckets";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

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
            <GeneralTooltip
              key={i}
              open={isActive}
              title={
                <TooltipBody>
                  <TooltipMain>
                    {v} commit{v === 1 ? "" : "s"}
                  </TooltipMain>
                  <TooltipSub>{dayLabel}</TooltipSub>
                </TooltipBody>
              }
              placement="top"
            >
              <BarColumn>
                <Bar active={isActive} heightPct={(v / maxDay) * 100} index={i} />
              </BarColumn>
            </GeneralTooltip>
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
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
})) as typeof Box;

const CardActivity = styled(Card)({
  gridColumn: "1 / -1",
});

const CardHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}) as typeof Box;

const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
})) as typeof Typography;

const CardMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Typography;

const Chart = styled(Box, {
  shouldForwardProp: (prop) => prop !== "columns",
})<{ columns: number }>(({ columns }) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap: 6,
  height: 200,
  alignItems: "end",
  padding: "4px 0 0",
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
})<{ heightPct: number; index: number; active: boolean }>(
  ({ theme, heightPct, index, active }) => ({
    width: "100%",
    // Floor so a bucket with a few commits still reads as a real bar, not "0".
    minHeight: heightPct > 0 ? 7 : 0,
    height: active ? "100%" : `${heightPct}%`,
    backgroundColor: active
      ? theme.palette.primary.main
      : `color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
    backgroundImage: active
      ? "none"
      : `radial-gradient(circle, color-mix(in srgb, ${theme.palette.primary.main} 55%, transparent) 0.6px, transparent 1px)`,
    backgroundSize: "7px 7px",
    border: `1px solid ${
      active
        ? theme.palette.primary.main
        : `color-mix(in srgb, ${theme.palette.primary.main} 65%, transparent)`
    }`,
    borderBottom: 0,
    borderRadius: "8px 8px 0 0",
    transformOrigin: "bottom",
    animation: `${barGrow} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    animationDelay: `${index * 28}ms`,
    transition:
      "background-color 0.12s ease, border-color 0.12s ease, height 0.16s cubic-bezier(0.22, 1, 0.36, 1)",
    'html[data-reduced-motion="true"] &': {
      animation: "none",
    },
  }),
);

const ChartAxis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  padding: "0 4px",
})) as typeof Box;

const TooltipBody = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
}) as typeof Box;

const TooltipMain = styled(Box)({
  fontWeight: 600,
}) as typeof Box;

const TooltipSub = styled(Box)({
  fontSize: 10,
  opacity: 0.7,
}) as typeof Box;
