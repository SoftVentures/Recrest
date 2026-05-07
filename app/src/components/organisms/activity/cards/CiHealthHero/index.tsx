import { useTranslation } from "react-i18next";

import type { CheckRunSummary } from "@recrest/shared";

interface Props {
  summaries: readonly CheckRunSummary[];
}

interface Segment {
  key: "passed" | "failed" | "other";
  value: number;
  color: string;
}

/**
 * Render the CI-health donut as a stacked ring split by run outcome
 * (passed / failed / other). The previous single-color circle compressed
 * "98% of 200 runs" and "100% of 4 runs" into the same visual; the stacked
 * variant shows both the proportion *and* the absolute outcome mix.
 *
 * `other` covers runs that finished without a clear pass/fail signal —
 * skipped, cancelled, neutral — i.e. `total - passed - failed`. We surface it
 * as amber so users can spot when CI is technically "green" but mostly
 * skipped.
 */
export function CiHealthHero({ summaries }: Props) {
  const { t } = useTranslation();
  let passed = 0;
  let total = 0;
  let failing = 0;
  for (const s of summaries) {
    passed += s.passed;
    total += s.total;
    failing += s.failed;
  }
  const other = Math.max(0, total - passed - failing);
  const pct = total === 0 ? 1 : passed / total;
  const headlineColor = pct >= 0.95 ? "var(--green)" : pct >= 0.8 ? "var(--amber)" : "var(--red)";

  // Donut geometry — keep the same 27/22 viewbox the previous ring used so
  // surrounding layout doesn't reflow.
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  const segments: Segment[] = [
    { key: "passed", value: passed, color: "var(--green)" },
    { key: "failed", value: failing, color: "var(--red)" },
    { key: "other", value: other, color: "var(--amber)" },
  ];
  const segTotal = segments.reduce((a, s) => a + s.value, 0);

  // Build dasharray offsets: each segment renders as a partial dasharray that
  // starts where the previous one ended. SVG strokes start at the 3 o'clock
  // position by default; rotating the group -90° puts the start at 12.
  let cursor = 0;
  const renderedSegments =
    segTotal === 0
      ? []
      : segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = (s.value / segTotal) * circumference;
            const offset = -cursor;
            cursor += length;
            return {
              ...s,
              dash: `${length} ${circumference - length}`,
              offset,
            };
          });

  return (
    <div className="a-act-kpi">
      <div className="a-act-kpi-label">{t("activity.hero.ci_health")}</div>
      <div className="a-act-ring">
        <svg className="a-act-ring-svg" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r={radius} className="a-act-ring-track" />
          {renderedSegments.length === 0 ? (
            <circle
              cx="27"
              cy="27"
              r={radius}
              className="a-act-ring-fill"
              style={{
                stroke: "var(--ink-4)",
                strokeDasharray: circumference,
                strokeDashoffset: circumference,
              }}
            />
          ) : (
            renderedSegments.map((s) => (
              <circle
                key={s.key}
                cx="27"
                cy="27"
                r={radius}
                className="a-act-ring-fill"
                style={{
                  stroke: s.color,
                  strokeDasharray: s.dash,
                  strokeDashoffset: s.offset,
                }}
              />
            ))
          )}
        </svg>
        <div className="a-act-ring-label">
          <div className="a-act-ring-value" style={{ color: headlineColor }}>
            {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
          </div>
          <div className="a-act-ring-sub">
            {total === 0
              ? t("activity.hero.ci_none")
              : t("activity.hero.ci_runs", { passed, total })}
          </div>
        </div>
      </div>
      {total > 0 && (
        <div className="a-act-ring-legend" data-testid="ci-health-legend">
          <span className="a-act-ring-legend-item">
            <span className="a-act-ring-legend-dot" style={{ background: "var(--green)" }} />
            {t("activity.hero.ci_legend_passed", { count: passed })}
          </span>
          <span className="a-act-ring-legend-item">
            <span className="a-act-ring-legend-dot" style={{ background: "var(--red)" }} />
            {t("activity.hero.ci_legend_failed", { count: failing })}
          </span>
          {other > 0 && (
            <span className="a-act-ring-legend-item">
              <span className="a-act-ring-legend-dot" style={{ background: "var(--amber)" }} />
              {t("activity.hero.ci_legend_other", { count: other })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
