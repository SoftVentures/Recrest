import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import type { CheckRunSummary } from "@recrest/shared";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { PassRateDay } from "@/lib/activityAggregates";
import { monotoneCubic } from "@/lib/charts/smoothLine";

interface Props {
  rows: PassRateDay[];
  /** Raw per-repo/day summaries — used for the per-repo breakdown below the
   *  chart so users can actually see *which* repos were green (or red). */
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

export function CiPassRateCard({ rows, summaries, loading }: Props) {
  const { t } = useTranslation();
  const chronological = [...rows].reverse();

  // SVG plot uses `preserveAspectRatio="none"` because we want the line to
  // stretch across whatever width the card ends up at. That stretching
  // distorts any in-SVG `<text>`, so axis labels live in an HTML gutter
  // next to the plot instead.
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
  // Close the smoothed line to the baseline so the area fill picks up the
  // same curve shape as the stroke (no straight-line bottom under a smooth
  // top).
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

  // Headline: use the exact fraction (2 decimals) so 97.5% ≠ 97.9% ≠ 98.1%
  // don't all collapse to "98%". Trim trailing zeros so whole numbers read
  // cleanly ("100%" rather than "100.00%").
  const exactPct = avgRate == null ? null : avgRate * 100;
  const headlineText =
    exactPct == null
      ? null
      : `${(Math.round(exactPct * 100) / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  const headline =
    headlineText == null ? null : (
      <div className="a-act-ci-headline">
        <span className="a-act-line-headline">{headlineText}</span>
        <span className="a-act-ci-headline-label">avg pass</span>
      </div>
    );

  const subBits: string[] = [];
  if (repoCount > 0) {
    subBits.push(`across ${repoCount} ${repoCount === 1 ? "repo" : "repos"}`);
  }
  if (totalRuns > 0) subBits.push(`${totalRuns} runs`);
  subBits.push(t("activity.cards.ci_trend_sub_window", "last 14 days"));
  const sub = subBits.join(" · ");

  return (
    <CardShell
      title={t("activity.cards.ci_trend_title")}
      sub={sub}
      right={headline}
      loading={loading}
      skeleton="line"
    >
      <div className="a-act-ci-chart">
        {/* HTML axis gutter — text stays crisp at its declared font-size
         * regardless of how the SVG stretches. */}
        <div className="a-act-ci-axis" aria-hidden>
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="a-act-ci-plot">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <line
              x1={padX}
              x2={w - padX}
              y1={padT + plotH}
              y2={padT + plotH}
              className="a-act-line-axis"
            />
            <line
              x1={padX}
              x2={w - padX}
              y1={padT}
              y2={padT}
              className="a-act-line-axis"
              strokeDasharray="2 3"
            />
            <line
              x1={padX}
              x2={w - padX}
              y1={padT + plotH / 2}
              y2={padT + plotH / 2}
              className="a-act-line-axis"
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <path d={area} className="a-act-line-fill a-act-anim-area" fill="var(--green)" />
            <path
              d={line}
              className="a-act-line-series a-act-anim-line"
              style={{ ["--line-len" as string]: 600 }}
              stroke="var(--green)"
            />
          </svg>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="a-act-ci-repos">
          {breakdown.map((r) => {
            const pct = Math.round(r.rate * 100);
            const tone = pct >= 95 ? "ok" : pct >= 80 ? "warn" : "fail";
            return (
              <div key={r.repoId} className={`a-act-ci-repo tone-${tone}`}>
                <span className="a-act-ci-repo-name">{r.repoName}</span>
                <span className="a-act-ci-repo-bar">
                  <span
                    className="a-act-ci-repo-bar-fill a-act-anim-barh"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="a-act-ci-repo-pct">{pct}%</span>
                <span className="a-act-ci-repo-runs">{r.total}</span>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
