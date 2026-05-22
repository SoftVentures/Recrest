import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { VelocityDay } from "@/lib/activityAggregates";
import { monotoneCubic } from "@/lib/charts/smoothLine";

interface Props {
  rows: VelocityDay[];
  loading?: boolean;
}

const ChartWrap = styled(Box)({
  width: "100%",
});

const Svg = styled("svg")({
  width: "100%",
  height: 140,
});

const Axis = styled("line")(({ theme }) => ({
  stroke: theme.palette.divider,
  strokeWidth: 1,
}));

const Series = styled("path")({
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

const Legend = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 12,
  marginTop: 6,
  fontSize: 11,
  color: theme.palette.text.information,
  "& > span": {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
}));

const LegendDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
}));

function smoothSeries(values: number[], peak: number, w: number, h: number, pad: number): string {
  const n = values.length;
  if (n === 0) return "";
  const stepX = (w - pad * 2) / Math.max(1, n - 1);
  const points = values.map((v, i) => ({
    x: pad + i * stepX,
    y: h - pad - (v / Math.max(1, peak)) * (h - pad * 2),
  }));
  return monotoneCubic(points);
}

function PrVelocityCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const chronological = [...rows].reverse();
  const opened = chronological.map((r) => r.opened);
  const merged = chronological.map((r) => r.merged);
  const peak = Math.max(1, ...opened, ...merged);
  const w = 320;
  const h = 140;
  const pad = 12;
  const openedColor = "var(--mui-palette-primary-main, #f97316)";
  const mergedColor = "var(--mui-palette-success-main, #16a34a)";
  return (
    <GeneralCard
      title={t("activity.cards.pr_velocity_title", { defaultValue: "MR velocity" })}
      sub={t("activity.cards.pr_velocity_sub", { defaultValue: "opened vs merged · 14 days" })}
      loading={loading}
      skeleton="line"
      testId="activity-velocity-card"
    >
      <ChartWrap>
        <Svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <Axis x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} />
          <Series d={smoothSeries(opened, peak, w, h, pad)} stroke={openedColor} />
          <Series d={smoothSeries(merged, peak, w, h, pad)} stroke={mergedColor} />
        </Svg>
      </ChartWrap>
      <Legend>
        <span>
          <LegendDot color={openedColor} />
          {t("activity.cards.pr_velocity_opened", { defaultValue: "Opened" })}
        </span>
        <span>
          <LegendDot color={mergedColor} />
          {t("activity.cards.pr_velocity_merged", { defaultValue: "Merged" })}
        </span>
      </Legend>
    </GeneralCard>
  );
}

export default PrVelocityCard;
