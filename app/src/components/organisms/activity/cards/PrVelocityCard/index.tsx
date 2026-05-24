import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { VelocityDay } from "@/lib/activityAggregates";
import { smoothSeries } from "@/lib/charts/smoothLine";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

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

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const LegendDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
}));

function PrVelocityCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const chronological = [...rows].reverse();
  const opened = chronological.map((r) => r.opened);
  const merged = chronological.map((r) => r.merged);
  const peak = Math.max(1, ...opened, ...merged);
  const w = 320;
  const h = 140;
  const pad = 12;
  const openedColor = theme.palette.primary.main;
  const mergedColor = theme.palette.success.main;
  return (
    <GeneralCard
      title={t("activity.cards.pr_velocity_title")}
      sub={t("activity.cards.pr_velocity_sub")}
      loading={loading}
      skeleton="line"
      testId={TEST_IDS.activity.cards.prVelocity}
    >
      <ChartWrap>
        <Svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <Axis x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} />
          <Series d={smoothSeries(opened, peak, w, h, pad)} stroke={openedColor} />
          <Series d={smoothSeries(merged, peak, w, h, pad)} stroke={mergedColor} />
        </Svg>
      </ChartWrap>
      <Legend>
        <Box component="span">
          <LegendDot color={openedColor} />
          {t("activity.cards.pr_velocity_opened")}
        </Box>
        <Box component="span">
          <LegendDot color={mergedColor} />
          {t("activity.cards.pr_velocity_merged")}
        </Box>
      </Legend>
    </GeneralCard>
  );
}

export default PrVelocityCard;
