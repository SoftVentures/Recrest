import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { ResponsiveLine } from "@nivo/line";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import ChartTooltip from "@/components/organisms/activity/cards/parts/ChartTooltip";
import type { VelocityDay } from "@/lib/activityAggregates";
import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { CHART_PALETTE } from "@/lib/charts/palette";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  rows: VelocityDay[];
  windowDays?: number;
  loading?: boolean;
}

const ChartWrap = styled(Box)({
  width: "100%",
  height: 140,
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

function PrVelocityCard({ rows, windowDays = 14, loading }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const openedColor = CHART_PALETTE[0];
  const mergedColor = theme.palette.success.main;

  const size = bucketSizeForWindow(windowDays);
  // Newest-first buckets → reverse for chronological left-to-right.
  const buckets = bucketDays(rows, (r) => r.day, size).reverse();
  const points = buckets.map((b) => ({
    x: dayLabel(b.newestDay, i18n.language),
    opened: b.rows.reduce((a, r) => a + r.opened, 0),
    merged: b.rows.reduce((a, r) => a + r.merged, 0),
  }));

  const data = [
    {
      id: t("activity.cards.pr_velocity_opened"),
      data: points.map((p) => ({ x: p.x, y: p.opened })),
    },
    {
      id: t("activity.cards.pr_velocity_merged"),
      data: points.map((p) => ({ x: p.x, y: p.merged })),
    },
  ];

  const labels = points.map((p) => p.x);
  const every = Math.max(1, Math.ceil(labels.length / 5));
  const tickValues = labels.filter((_, i) => i % every === 0);

  return (
    <GeneralCard
      title={t("activity.cards.pr_velocity_title")}
      sub={t("activity.cards.pr_velocity_sub", { days: windowDays })}
      loading={loading}
      skeleton="line"
      testId={TEST_IDS.activity.cards.prVelocity}
    >
      <ChartWrap>
        <ResponsiveLine
          data={data}
          theme={nivoTheme}
          colors={[openedColor, mergedColor]}
          margin={{ top: 8, right: 8, bottom: 24, left: 28 }}
          curve="monotoneX"
          enablePoints={false}
          enableGridX={false}
          xScale={{ type: "point" }}
          axisBottom={{ tickValues, tickRotation: 0 }}
          axisLeft={{ tickValues: 4 }}
          enableSlices="x"
          sliceTooltip={({ slice }) => (
            <ChartTooltip
              title={String(slice.points[0]?.data.x ?? "")}
              rows={slice.points.map((p) => ({
                color: p.seriesColor,
                label: String(p.seriesId),
                value: String(p.data.yFormatted),
              }))}
            />
          )}
          useMesh
        />
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

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(PrVelocityCard);
