import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { VelocityDay } from "@/lib/activityAggregates";

interface Props {
  rows: VelocityDay[];
  loading?: boolean;
}

function polyline(values: number[], peak: number, w: number, h: number, pad: number): string {
  const n = values.length;
  if (n === 0) return "";
  const stepX = (w - pad * 2) / Math.max(1, n - 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (v / Math.max(1, peak)) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PrVelocityCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  // index 0 = today → render oldest-first for left-to-right time axis
  const chronological = [...rows].reverse();
  const opened = chronological.map((r) => r.opened);
  const merged = chronological.map((r) => r.merged);
  const peak = Math.max(1, ...opened, ...merged);
  const w = 320;
  const h = 140;
  const pad = 12;
  return (
    <CardShell
      title={t("activity.cards.pr_velocity_title")}
      sub={t("activity.cards.pr_velocity_sub")}
      loading={loading}
      skeleton="line"
    >
      <div className="a-act-line">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} className="a-act-line-axis" />
          <path
            d={polyline(opened, peak, w, h, pad)}
            className="a-act-line-series a-act-anim-line"
            style={{ ["--line-len" as string]: 600 }}
            stroke="var(--accent)"
          />
          <path
            d={polyline(merged, peak, w, h, pad)}
            className="a-act-line-series a-act-anim-line"
            style={{ ["--line-len" as string]: 600, animationDelay: "450ms" }}
            stroke="var(--green)"
          />
        </svg>
      </div>
      <div className="a-act-line-legend">
        <span>
          <span className="a-act-line-dot" style={{ background: "var(--accent)" }} />
          {t("activity.cards.pr_velocity_opened")}
        </span>
        <span>
          <span className="a-act-line-dot" style={{ background: "var(--green)" }} />
          {t("activity.cards.pr_velocity_merged")}
        </span>
      </div>
    </CardShell>
  );
}
