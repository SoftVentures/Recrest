import { type CSSProperties, type PointerEvent, useRef, useState } from "react";

import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";

export interface ActivityChartProps {
  agg: number[];
  maxDay: number;
  title: string;
  meta: string;
}

/**
 * Pointer position drives which column is "active" — the hover region extends
 * above the bar's visible footprint into empty card padding, which feels
 * larger than per-bar :hover would.
 */
export function ActivityChart({ agg, maxDay, title, meta }: ActivityChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

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
      <Chart ref={chartRef}>
        {agg.map((v, i) => {
          const daysAgo = 13 - i;
          const dayLabel =
            daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
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
                <Bar
                  data-active={isActive ? "true" : undefined}
                  style={
                    {
                      height: `${(v / maxDay) * 100}%`,
                      "--bar-index": i,
                    } as CSSProperties
                  }
                />
              </BarColumn>
            </GeneralTooltip>
          );
        })}
      </Chart>
      <ChartAxis>
        <Box component="span">14d ago</Box>
        <Box component="span">7d</Box>
        <Box component="span">today</Box>
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

const Chart = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(14, 1fr)",
  gap: 6,
  height: 96,
  alignItems: "end",
  padding: "4px 0 0",
}) as typeof Box;

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

const Bar = styled(Box)(({ theme }) => ({
  width: "100%",
  minHeight: 4,
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
  backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${theme.palette.primary.main} 55%, transparent) 0.6px, transparent 1px)`,
  backgroundSize: "7px 7px",
  border: `1px solid color-mix(in srgb, ${theme.palette.primary.main} 65%, transparent)`,
  borderBottom: 0,
  borderRadius: "8px 8px 0 0",
  transformOrigin: "bottom",
  animation: `${barGrow} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  animationDelay: "calc(var(--bar-index, 0) * 28ms)",
  transition:
    "background-color 0.12s ease, border-color 0.12s ease, height 0.16s cubic-bezier(0.22, 1, 0.36, 1)",
  "&[data-active='true']": {
    backgroundColor: theme.palette.primary.main,
    backgroundImage: "none",
    borderColor: theme.palette.primary.main,
    height: "100% !important",
  },
  'html[data-reduced-motion="true"] &': {
    animation: "none",
  },
})) as typeof Box;

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
