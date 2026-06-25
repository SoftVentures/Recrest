import { memo, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

import { ResponsiveLine } from "@nivo/line";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import {
  Breakdown,
  ChartWrap,
  Headline,
  RepoBar,
  RepoBarFill,
  RepoName,
  RepoPct,
  RepoRow,
  RepoRuns,
} from "@/components/organisms/activity/cards/CiPassRateCard/CiPassRateCard.styles";
import ChartTooltip from "@/components/organisms/activity/cards/parts/ChartTooltip";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import {
  type CiRepoBreakdown,
  type PassRateDay,
  computeCiRepoBreakdown,
} from "@/lib/activityAggregates";
import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { useResolvedLocale } from "@/lib/utils/datetime.utils";

// nivo's line point carries the original datum on `.data`. Typed here so the
// `onMouseMove` handler references a named shape instead of an inline
// double-cast — a nivo version bump that changes the point shape then surfaces
// as a single type error here rather than silently spreading.
interface CiLinePoint {
  data: { x?: unknown; passed?: number; total?: number };
}

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  rows: PassRateDay[];
  summaries?: readonly CheckRunSummary[];
  windowDays?: number;
  loading?: boolean;
}

function CiPassRateCard({ rows, summaries, windowDays = 14, loading }: Props) {
  const { t } = useTranslation();
  const locale = useResolvedLocale();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const { show, hide, portal } = useChartTooltip();
  const lineColor = theme.palette.primary.main;

  const size = bucketSizeForWindow(windowDays);
  // Newest-first buckets → reverse for chronological left-to-right. Each bucket
  // re-sums passed/total and recomputes rate (1 when total 0 — mirrors the
  // day-level convention in computeCiPassRate).
  const buckets = bucketDays(rows, (r) => r.day, size).reverse();
  const points = buckets.map((b) => {
    const passed = b.rows.reduce((a, r) => a + r.passed, 0);
    const total = b.rows.reduce((a, r) => a + r.total, 0);
    return {
      x: dayLabel(b.newestDay, locale),
      y: total === 0 ? 1 : passed / total,
      passed,
      total,
    };
  });
  const data = [{ id: "rate", data: points }];

  const labels = points.map((p) => p.x);
  const every = Math.max(1, Math.ceil(labels.length / 5));
  const tickValues = labels.filter((_, i) => i % every === 0);

  // Pass rates cluster near the top (80–100%), so a fixed 0–100% axis flattens
  // the trend into a line glued to the ceiling. Zoom the y-domain to just below
  // the lowest point (rounded down to 5%, with 5% headroom) so the variation
  // fills the chart. A real dip toward 0% widens the domain back out.
  const ys = points.map((p) => p.y);
  const dataMin = ys.length > 0 ? Math.min(...ys) : 1;
  const yMin = Math.max(0, Math.min(0.9, Math.floor(dataMin * 20) / 20 - 0.05));
  const yTicks = [yMin, (yMin + 1) / 2, 1];

  const totalPassed = rows.reduce((a, r) => a + r.passed, 0);
  const totalRuns = rows.reduce((a, r) => a + r.total, 0);
  const avgRate = totalRuns === 0 ? null : totalPassed / totalRuns;

  const breakdown = useMemo<CiRepoBreakdown[]>(
    () => (summaries ? computeCiRepoBreakdown(summaries) : []),
    [summaries],
  );
  const repoCount = breakdown.length;

  const exactPct = avgRate == null ? null : avgRate * 100;
  const headlineText =
    exactPct == null
      ? null
      : `${(Math.round(exactPct * 100) / 100).toFixed(2).replace(/\.?0+$/, "")}%`;

  const subBits: string[] = [];
  if (repoCount > 0) subBits.push(t("activity.cards.ci_trend_sub_repos", { count: repoCount }));
  if (totalRuns > 0) subBits.push(t("activity.cards.ci_trend_sub_runs", { count: totalRuns }));
  subBits.push(t("activity.cards.ci_trend_sub_window", { days: windowDays }));
  const sub = subBits.join(" · ");

  return (
    <GeneralCard
      title={t("activity.cards.ci_trend_title", { days: windowDays })}
      sub={sub}
      loading={loading}
      skeleton="line"
      testId={TEST_IDS.activity.cards.ciPassRate}
      right={
        headlineText && (
          <Headline>
            <Box component="strong">{headlineText}</Box>
            <Box component="span">{t("activity.cards.ci_trend_avg")}</Box>
          </Headline>
        )
      }
    >
      <ChartWrap>
        <ResponsiveLine
          data={data}
          theme={nivoTheme}
          colors={[lineColor]}
          margin={{ top: 8, right: 8, bottom: 24, left: 44 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: yMin, max: 1 }}
          curve="monotoneX"
          enablePoints={false}
          enableGridX={false}
          enableArea
          areaBaselineValue={yMin}
          areaOpacity={0.12}
          axisBottom={{ tickValues, tickRotation: 0 }}
          axisLeft={{ tickValues: yTicks, format: ">-.0%" }}
          useMesh
          tooltip={() => <></>}
          onMouseMove={(point, e) => {
            const datum = (point as unknown as CiLinePoint).data;
            const passed = datum.passed ?? 0;
            const total = datum.total ?? 0;
            const pct = Math.round((total === 0 ? 1 : passed / total) * 100);
            show(
              e.clientX,
              e.clientY,
              <ChartTooltip
                title={String(datum.x ?? "")}
                rows={[
                  {
                    color: lineColor,
                    label: `${pct}%`,
                    value: t("activity.tooltip.ci_passed", { passed, total }),
                  },
                ]}
              />,
            );
          }}
          onMouseLeave={hide}
        />
      </ChartWrap>
      {portal}

      {breakdown.length > 0 && (
        <Breakdown>
          {breakdown.map((r) => {
            const pct = Math.round(r.rate * 100);
            return (
              <RepoRow key={r.repoId}>
                <RepoName component="span" variant="caption">
                  {r.repoName}
                </RepoName>
                <RepoBar>
                  <RepoBarFill width={pct} />
                </RepoBar>
                <RepoPct component="span" variant="caption">
                  {pct}%
                </RepoPct>
                <RepoRuns component="span" variant="caption">
                  {r.total}
                </RepoRuns>
              </RepoRow>
            );
          })}
        </Breakdown>
      )}
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(CiPassRateCard);
