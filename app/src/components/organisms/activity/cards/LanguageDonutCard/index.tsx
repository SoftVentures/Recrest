import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { LanguageSlice } from "@/lib/activityAggregates";

interface Props {
  mix: LanguageSlice[];
  loading?: boolean;
}

interface Arc {
  slice: LanguageSlice;
  path: string;
}

function donutArcs(mix: LanguageSlice[], radius: number, cx: number, cy: number): Arc[] {
  const arcs: Arc[] = [];
  let cursor = -Math.PI / 2;
  for (const slice of mix) {
    const angle = slice.share * 2 * Math.PI;
    const end = cursor + angle;
    const x1 = cx + Math.cos(cursor) * radius;
    const y1 = cy + Math.sin(cursor) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    arcs.push({ slice, path });
    cursor = end;
  }
  return arcs;
}

export function LanguageDonutCard({ mix, loading }: Props) {
  const { t } = useTranslation();
  const totalCommits = Math.round(mix.reduce((a, b) => a + b.commits, 0));
  // Collapse the long tail (<1% share) into the existing "Other" bucket so
  // we never render two "Other" rows — the bucketizer already emits one
  // for lock files / archives / unknown extensions, and the tail-collapse
  // below needs to merge into that same entry rather than create a sibling.
  const TAIL_THRESHOLD = 0.01;
  const legend = useMemo(() => {
    const result: LanguageSlice[] = [];
    let otherCommits = 0;
    let otherShare = 0;
    let otherHits = 0;
    for (const slice of mix) {
      if (slice.language === "Other" || slice.share < TAIL_THRESHOLD) {
        otherCommits += slice.commits;
        otherShare += slice.share;
        otherHits += 1;
        continue;
      }
      result.push(slice);
    }
    if (otherHits > 0) {
      result.push({
        language: otherHits === 1 ? "Other" : `Other (${otherHits})`,
        color: "#8a8a9a",
        share: otherShare,
        commits: otherCommits,
      });
    }
    return result;
  }, [mix]);
  const arcs = useMemo(() => donutArcs(legend, 48, 60, 60), [legend]);
  return (
    <CardShell
      title={t("activity.cards.language_title")}
      sub={t("activity.cards.language_sub")}
      loading={loading}
      skeleton="donut"
    >
      <div className="a-act-donut-wrap">
        <svg className="a-act-donut-svg" viewBox="0 0 120 120">
          {arcs.map((a, i) => (
            <path
              key={a.slice.language}
              d={a.path}
              fill={a.slice.color}
              className="a-act-donut-arc"
              style={{ animationDelay: `${220 + i * 60}ms` }}
            />
          ))}
          <circle cx="60" cy="60" r="34" fill="var(--surface-1)" />
          <text x="60" y="56" className="a-act-donut-centre">
            {totalCommits}
          </text>
          <text x="60" y="78" className="a-act-donut-sub">
            commits
          </text>
        </svg>
        <ul className="a-act-donut-legend">
          {legend.map((s) => (
            <li key={s.language}>
              <span className="a-act-donut-swatch" style={{ background: s.color }} />
              <span>{s.language}</span>
              <span>{Math.round(s.share * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </CardShell>
  );
}
