import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { CheckRunSummary } from "@recrest/shared";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { PassRateDay } from "@/lib/activityAggregates";
import { monotoneCubic } from "@/lib/charts/smoothLine";

interface Props {
  rows: PassRateDay[];
  summaries?: readonly CheckRunSummary[];
  loading?: boolean;
}

interface RepoBreakdown {
  repoId: string;
  repoName: string;
  passed: number;
  total: number;
  rate: number;
}

function buildRepoBreakdown(summaries: readonly CheckRunSummary[]): RepoBreakdown[] {
  const byRepo = new Map<string, RepoBreakdown>();
  for (const s of summaries) {
    const existing = byRepo.get(s.repoId);
    if (existing) {
      existing.passed += s.passed;
      existing.total += s.total;
    } else {
      byRepo.set(s.repoId, {
        repoId: s.repoId,
        repoName: s.repoName,
        passed: s.passed,
        total: s.total,
        rate: 0,
      });
    }
  }
  const out: RepoBreakdown[] = [];
  for (const r of byRepo.values()) {
    r.rate = r.total === 0 ? 1 : r.passed / r.total;
    out.push(r);
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

const Chart = styled(Box)({
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  gap: 6,
  alignItems: "stretch",
});

const Axis = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  textAlign: "right",
  padding: "8px 0",
}));

const Plot = styled(Box)({
  width: "100%",
});

const Svg = styled("svg")({
  width: "100%",
  height: 140,
});

const AxisLine = styled("line")(({ theme }) => ({
  stroke: theme.palette.divider,
  strokeWidth: 1,
}));

const Series = styled("path")({
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

const Fill = styled("path")({
  fillOpacity: 0.18,
});

const Headline = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  "& > strong": {
    fontSize: 22,
    fontWeight: 700,
    color: theme.palette.success.main,
    letterSpacing: "-0.4px",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  "& > span": {
    fontSize: 10,
    color: theme.palette.text.information,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
    marginTop: 2,
  },
}));

const Breakdown = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginTop: 6,
});

const RepoRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(60px, 100px) 32px 36px",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: theme.palette.text.information,
}));

const RepoName = styled("span")(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const RepoBar = styled(Box)(({ theme }) => ({
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
}));

const RepoBarFill = styled(Box, {
  shouldForwardProp: (p) => p !== "width" && p !== "tone",
})<{
  width: number;
  tone: "ok" | "warn" | "fail";
}>(({ theme, width, tone }) => ({
  width: `${width}%`,
  height: "100%",
  backgroundColor:
    tone === "ok"
      ? theme.palette.success.main
      : tone === "warn"
        ? theme.palette.warning.main
        : theme.palette.error.main,
}));

const RepoPct = styled("span")(({ theme }) => ({
  textAlign: "right",
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
}));

const RepoRuns = styled("span")(({ theme }) => ({
  textAlign: "right",
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

function CiPassRateCard({ rows, summaries, loading }: Props) {
  const { t } = useTranslation();
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

  const breakdown = useMemo<RepoBreakdown[]>(
    () => (summaries ? buildRepoBreakdown(summaries) : []),
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
  subBits.push(t("activity.cards.ci_trend_sub_window", { defaultValue: "last 14 days" }));
  const sub = subBits.join(" · ");

  const greenColor = "var(--mui-palette-success-main, #16a34a)";

  return (
    <GeneralCard
      title={t("activity.cards.ci_trend_title", { defaultValue: "CI pass rate · 14 days" })}
      sub={sub}
      loading={loading}
      skeleton="line"
      testId="activity-ci-card"
      right={
        headlineText && (
          <Headline>
            <strong>{headlineText}</strong>
            <span>avg pass</span>
          </Headline>
        )
      }
    >
      <Chart>
        <Axis aria-hidden>
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
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
                <RepoName>{r.repoName}</RepoName>
                <RepoBar>
                  <RepoBarFill width={pct} tone={tone} />
                </RepoBar>
                <RepoPct>{pct}%</RepoPct>
                <RepoRuns>{r.total}</RepoRuns>
              </RepoRow>
            );
          })}
        </Breakdown>
      )}
    </GeneralCard>
  );
}

export default CiPassRateCard;
