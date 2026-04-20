import { useTranslation } from "react-i18next";

import type { CheckRunSummary } from "@recrest/shared";

interface Props {
  summaries: readonly CheckRunSummary[];
}

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
  const pct = total === 0 ? 1 : passed / total;
  const circumference = 2 * Math.PI * 22;
  const offset = circumference * (1 - pct);
  const color = pct >= 0.95 ? "var(--green)" : pct >= 0.8 ? "var(--amber)" : "var(--red)";

  return (
    <div className="a-act-kpi">
      <div className="a-act-kpi-label">{t("activity.hero.ci_health")}</div>
      <div className="a-act-ring">
        <svg className="a-act-ring-svg" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r="22" className="a-act-ring-track" />
          <circle
            cx="27"
            cy="27"
            r="22"
            className="a-act-ring-fill"
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="a-act-ring-label">
          <div className="a-act-ring-value" style={{ color }}>
            {total === 0 ? "—" : `${Math.round(pct * 100)}%`}
          </div>
          <div className="a-act-ring-sub">
            {total === 0
              ? t("activity.hero.ci_none")
              : `${passed}/${total} runs${failing > 0 ? ` · ${failing} failing` : ""}`}
          </div>
        </div>
      </div>
    </div>
  );
}
