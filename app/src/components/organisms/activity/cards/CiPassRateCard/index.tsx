import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import {
  Axis,
  AxisLine,
  Breakdown,
  Chart,
  Fill,
  Headline,
  Plot,
  RepoBar,
  RepoBarFill,
  RepoName,
  RepoPct,
  RepoRow,
  RepoRuns,
  Series,
  Svg,
} from "@/components/organisms/activity/cards/CiPassRateCard/CiPassRateCard.styles";
import {
  type CiRepoBreakdown,
  type PassRateDay,
  computeCiRepoBreakdown,
} from "@/lib/activityAggregates";
import { monotoneCubic } from "@/lib/charts/smoothLine";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  rows: PassRateDay[];
  summaries?: readonly CheckRunSummary[];
  loading?: boolean;
}

function CiPassRateCard({ rows, summaries, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const chronological = [...rows].reverse();
  const w = 320;
  const h = 140;
  const padT = 10;
  const padB = 10;
  const padX = 6;
  const plotW = w - padX * 2;
  const plotH = h - padT - padB;
  const points = chronological.map((r, i) => {
    const x = padX + (i / Math.max(1, chronological.length - 1)) * plotW;
    const y = padT + (1 - r.rate) * plotH;
    return { x, y };
  });
  const line = monotoneCubic(points);
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1]!.x.toFixed(3)},${(padT + plotH).toFixed(3)} L${points[0]!.x.toFixed(3)},${(padT + plotH).toFixed(3)} Z`
      : "";

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
  if (repoCount > 0) subBits.push(`across ${repoCount} ${repoCount === 1 ? "repo" : "repos"}`);
  if (totalRuns > 0) subBits.push(`${totalRuns} runs`);
  subBits.push(t("activity.cards.ci_trend_sub_window"));
  const sub = subBits.join(" · ");

  const greenColor = theme.palette.success.main;

  return (
    <GeneralCard
      title={t("activity.cards.ci_trend_title")}
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
      <Chart>
        <Axis aria-hidden>
          <Box component="span">100%</Box>
          <Box component="span">50%</Box>
          <Box component="span">0%</Box>
        </Axis>
        <Plot>
          <Svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <AxisLine x1={padX} x2={w - padX} y1={padT + plotH} y2={padT + plotH} />
            <AxisLine
              x1={padX}
              x2={w - padX}
              y1={padT}
              y2={padT}
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <AxisLine
              x1={padX}
              x2={w - padX}
              y1={padT + plotH / 2}
              y2={padT + plotH / 2}
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <Fill d={area} fill={greenColor} />
            <Series d={line} stroke={greenColor} />
          </Svg>
        </Plot>
      </Chart>

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

export default CiPassRateCard;
