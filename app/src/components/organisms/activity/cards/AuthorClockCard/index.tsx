import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";

interface Props {
  hours: number[];
  loading?: boolean;
}

/** 24-segment radial chart — one wedge per hour, radius scaled by commit count. */
export function AuthorClockCard({ hours, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...hours);
  const cx = 75;
  const cy = 75;
  const rMax = 62;
  const rMin = 26;
  const wedge = (2 * Math.PI) / 24;
  // Sqrt scaling so a single commit still claims visible surface when `peak`
  // is much larger — radial charts otherwise compress small values into
  // invisible slivers against the inner ring.
  const scale = (v: number) => (v === 0 ? 0 : Math.sqrt(v / peak));

  const wedgePath = (hour: number, radius: number): string => {
    const a1 = -Math.PI / 2 + hour * wedge;
    const a2 = a1 + wedge * 0.9;
    const x1 = cx + Math.cos(a1) * rMin;
    const y1 = cy + Math.sin(a1) * rMin;
    const x2 = cx + Math.cos(a1) * radius;
    const y2 = cy + Math.sin(a1) * radius;
    const x3 = cx + Math.cos(a2) * radius;
    const y3 = cy + Math.sin(a2) * radius;
    const x4 = cx + Math.cos(a2) * rMin;
    const y4 = cy + Math.sin(a2) * rMin;
    return `M ${x1} ${y1} L ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rMin} ${rMin} 0 0 0 ${x1} ${y1} Z`;
  };

  const total = hours.reduce((a, b) => a + b, 0);
  const peakHour = hours.indexOf(peak);
  const peakLabel =
    total > 0
      ? `${String(peakHour).padStart(2, "0")}:00 · ${Math.round((peak / total) * 100)}%`
      : "—";

  return (
    <CardShell
      title={t("activity.cards.clock_title")}
      sub={t("activity.cards.clock_sub")}
      loading={loading}
      skeleton="radial"
    >
      <div className="a-act-clock">
        <svg viewBox="0 0 150 150">
          <circle cx={cx} cy={cy} r={rMax} fill="var(--surface-2)" opacity="0.45" />
          <circle cx={cx} cy={cy} r={rMin - 2} fill="var(--surface-1)" />
          {hours.map((v, h) => {
            const k = scale(v);
            const r = v === 0 ? rMin + 0.5 : rMin + (rMax - rMin) * k;
            const opacity = v === 0 ? 0.12 : 0.55 + 0.45 * k;
            return <path key={h} d={wedgePath(h, r)} fill="var(--accent)" opacity={opacity} />;
          })}
          {[0, 6, 12, 18].map((h) => {
            const a = -Math.PI / 2 + h * wedge;
            const x = cx + Math.cos(a) * (rMax + 8);
            const y = cy + Math.sin(a) * (rMax + 8);
            return (
              <text
                key={h}
                x={x}
                y={y}
                fontSize="9"
                fill="var(--ink-3)"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {String(h).padStart(2, "0")}
              </text>
            );
          })}
        </svg>
        <div className="a-act-clock-foot">
          <div>
            <strong>{peakLabel}</strong>
          </div>
          <div style={{ marginTop: 4 }}>{total} commits</div>
        </div>
      </div>
    </CardShell>
  );
}
