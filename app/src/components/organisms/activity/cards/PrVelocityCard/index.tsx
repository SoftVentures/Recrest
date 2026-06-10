import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { ResponsiveBar } from "@nivo/bar";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import ChartTooltip from "@/components/organisms/activity/cards/parts/ChartTooltip";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import type { VelocityDay } from "@/lib/activityAggregates";
import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
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
  const { show, move, hide, portal } = useChartTooltip();
  const openedColor = theme.palette.primary.main;
  const mergedColor = theme.palette.success.main;
  const openedLabel = t("activity.cards.pr_velocity_opened");
  const mergedLabel = t("activity.cards.pr_velocity_merged");

  const size = bucketSizeForWindow(windowDays);
  // Newest-first buckets → reverse for chronological left-to-right.
  const buckets = bucketDays(rows, (r) => r.day, size).reverse();
  const data = buckets.map((b) => ({
    x: dayLabel(b.newestDay, i18n.language),
    [openedLabel]: b.rows.reduce((a, r) => a + r.opened, 0),
    [mergedLabel]: b.rows.reduce((a, r) => a + r.merged, 0),
  }));

  const labels = data.map((d) => String(d.x));
  const every = Math.max(1, Math.ceil(labels.length / 5));
  const tickValues = labels.filter((_, i) => i % every === 0);
  const colorByKey: Record<string, string> = {
    [openedLabel]: openedColor,
    [mergedLabel]: mergedColor,
  };

  const renderTip = (indexValue: string | number, row: Record<string, string | number>) => (
    <ChartTooltip
      title={String(indexValue)}
      rows={[openedLabel, mergedLabel].map((key) => ({
        color: colorByKey[key],
        label: key,
        value: String(Number(row[key] ?? 0)),
      }))}
    />
  );

  return (
    <GeneralCard
      title={t("activity.cards.pr_velocity_title")}
      sub={t("activity.cards.pr_velocity_sub", { days: windowDays })}
      loading={loading}
      skeleton="bars"
      testId={TEST_IDS.activity.cards.prVelocity}
    >
      {/* @nivo/bar fires only onMouseEnter — wrapper mousemove keeps the
          portalled tooltip tracking the cursor across the bar. */}
      <ChartWrap onMouseMove={(e) => move(e.clientX, e.clientY)}>
        <ResponsiveBar
          data={data}
          keys={[openedLabel, mergedLabel]}
          indexBy="x"
          groupMode="grouped"
          theme={nivoTheme}
          colors={(bar) => colorByKey[String(bar.id)] ?? theme.palette.primary.main}
          margin={{ top: 8, right: 8, bottom: 24, left: 28 }}
          padding={0.3}
          innerPadding={2}
          borderRadius={2}
          enableLabel={false}
          enableGridX={false}
          axisBottom={{ tickValues, tickRotation: 0 }}
          axisLeft={{ tickValues: 4 }}
          tooltip={() => <></>}
          onMouseEnter={(d, e) => show(e.clientX, e.clientY, renderTip(d.indexValue, d.data))}
          onMouseLeave={hide}
        />
      </ChartWrap>
      {portal}
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
