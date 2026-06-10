import { memo } from "react";

import { useTranslation } from "react-i18next";

import { useTheme } from "@mui/material/styles";

import { ResponsiveBar } from "@nivo/bar";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { ChartArea } from "@/components/organisms/activity/cards/StackedChartCard/StackedChartCard.styles";
import ChartTooltip from "@/components/organisms/activity/cards/parts/ChartTooltip";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import type { StackedDay } from "@/lib/activityStats";
import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  stacked: StackedDay[];
  total: number;
  windowDays: number;
  loading?: boolean;
}

function StackedChartCard({ stacked, total, windowDays, loading }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const { show, move, hide, portal } = useChartTooltip();

  const size = bucketSizeForWindow(windowDays);
  const repoNames = Array.from(new Set(stacked.flatMap((d) => d.segments.map((s) => s.repoName))));
  const colorByRepo = new Map(
    stacked.flatMap((d) => d.segments.map((s) => [s.repoName, s.color] as const)),
  );

  // Aggregate per-day rows into renderable buckets (daily ≤90d, weekly, then
  // monthly) — one bar per day freezes Nivo on year/all ranges. Buckets come
  // back newest-first, so reverse to render oldest → newest left-to-right.
  const buckets = bucketDays(stacked, (d) => d.day, size).reverse();
  const labelByBucket = new Map(
    buckets.map((b) => [b.bucket, dayLabel(b.newestDay, i18n.language)] as const),
  );
  const data = buckets.map((b) => {
    const summed: Record<string, number> = {};
    for (const day of b.rows) {
      for (const s of day.segments) {
        summed[s.repoName] = (summed[s.repoName] ?? 0) + s.count;
      }
    }
    return { day: labelByBucket.get(b.bucket)!, ...summed };
  });

  const labels = data.map((d) => d.day);
  const every = Math.max(1, Math.ceil(labels.length / 5));
  const tickValues = labels.filter((_, i) => i % every === 0);

  // Full-day breakdown (every repo with commits, not just the hovered segment).
  const renderTip = (indexValue: string | number, rowData: Record<string, string | number>) => (
    <ChartTooltip
      title={String(indexValue)}
      rows={repoNames
        .map((name) => ({ name, count: Number(rowData[name] ?? 0) }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((r) => ({
          color: colorByRepo.get(r.name) ?? theme.palette.primary.main,
          label: r.name,
          value: t("activity.cards.commits_count", { count: r.count }),
        }))}
    />
  );

  return (
    <GeneralCard
      title={t("activity.cards.chart_title", { days: windowDays })}
      sub={t("activity.chart.sub", { total })}
      loading={loading}
      skeleton="bars"
      testId={TEST_IDS.activity.stacked.card}
    >
      {/* @nivo/bar fires only onMouseEnter — wrapper mousemove keeps the
          portalled tooltip tracking the cursor across the bar. */}
      <ChartArea
        data-testid={TEST_IDS.activity.stacked.chart}
        onMouseMove={(e) => move(e.clientX, e.clientY)}
      >
        <ResponsiveBar
          data={data}
          keys={repoNames}
          indexBy="day"
          theme={nivoTheme}
          colors={(bar) => colorByRepo.get(String(bar.id)) ?? theme.palette.primary.main}
          margin={{ top: 8, right: 8, bottom: 28, left: 28 }}
          padding={0.35}
          borderRadius={2}
          enableLabel={false}
          axisBottom={{ tickValues, tickRotation: 0 }}
          axisLeft={{ tickValues: 4 }}
          tooltip={() => <></>}
          onMouseEnter={(d, e) => show(e.clientX, e.clientY, renderTip(d.indexValue, d.data))}
          onMouseLeave={hide}
        />
      </ChartArea>
      {portal}
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(StackedChartCard);
