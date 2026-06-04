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
import {
  type CiRepoBreakdown,
  type PassRateDay,
  computeCiRepoBreakdown,
} from "@/lib/activityAggregates";
import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  rows: PassRateDay[];
  summaries?: readonly CheckRunSummary[];
  windowDays?: number;
  loading?: boolean;
}

function CiPassRateCard({ rows, summaries, windowDays = 14, loading }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const greenColor = theme.palette.success.main;

  const size = bucketSizeForWindow(windowDays);
  // Newest-first buckets → reverse for chronological left-to-right. Each bucket
  // re-sums passed/total and recomputes rate (1 when total 0 — mirrors the
  // day-level convention in computeCiPassRate).
  const buckets = bucketDays(rows, (r) => r.day, size).reverse();
  const points = buckets.map((b) => {
    const passed = b.rows.reduce((a, r) => a + r.passed, 0);
    const total = b.rows.reduce((a, r) => a + r.total, 0);
    return {
      x: dayLabel(b.newestDay, i18n.language),
      y: total === 0 ? 1 : passed / total,
      passed,
      total,
    };
  });
  const data = [{ id: "rate", data: points }];

  const labels = points.map((p) => p.x);
  const every = Math.max(1, Math.ceil(labels.length / 5));
  const tickValues = labels.filter((_, i) => i % every === 0);

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
            <Box component="span">avg pass</Box>
          </Headline>
        )
      }
    >
      <ChartWrap>
        <ResponsiveLine
          data={data}
          theme={nivoTheme}
          colors={[greenColor]}
          margin={{ top: 8, right: 8, bottom: 24, left: 36 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: 1 }}
          curve="monotoneX"
          enablePoints={false}
          enableGridX={false}
          enableArea
          areaOpacity={0.12}
          axisBottom={{ tickValues, tickRotation: 0 }}
          axisLeft={{ tickValues: [0, 0.5, 1], format: ">-.0%" }}
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const datum = point?.data as { passed?: number; total?: number } | undefined;
            const passed = datum?.passed ?? 0;
            const total = datum?.total ?? 0;
            const pct = Math.round((total === 0 ? 1 : passed / total) * 100);
            return (
              <ChartTooltip
                title={String(point?.data.x ?? "")}
                rows={[
                  {
                    color: greenColor,
                    label: `${pct}%`,
                    value: t("activity.tooltip.ci_passed", { passed, total }),
                  },
                ]}
              />
            );
          }}
          useMesh
        />
      </ChartWrap>

      {breakdown.length > 0 && (
        <Breakdown>
          {breakdown.map((r) => {
            const pct = Math.round(r.rate * 100);
            const tone: "ok" | "warn" | "fail" = pct >= 95 ? "ok" : pct >= 80 ? "warn" : "fail";
            return (
              <RepoRow key={r.repoId}>
                <RepoName component="span" variant="caption">
                  {r.repoName}
                </RepoName>
                <RepoBar>
                  <RepoBarFill width={pct} tone={tone} />
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
