import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import ActivityCardShell from "@/components/organisms/cards/ActivityCardShell";
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

/** Commit-weighted language donut. Tail languages (<1% share) are collapsed
 *  into the existing "Other" bucket. Centre shows total commit count. */
function LanguageDonutCard({ mix, loading }: Props) {
  const { t } = useTranslation();
  const totalCommits = Math.round(mix.reduce((a, b) => a + b.commits, 0));

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
    <ActivityCardShell
      title={t("activity.cards.language_title", { defaultValue: "Languages" })}
      sub={t("activity.cards.language_sub", {
        defaultValue: "Commit-weighted share across all repos",
      })}
      loading={loading}
      skeleton="donut"
    >
      <Wrap>
        <Svg viewBox="0 0 120 120">
          {arcs.map((a, i) => (
            <Arc
              key={a.slice.language}
              d={a.path}
              fill={a.slice.color}
              style={{ animationDelay: `${220 + i * 60}ms` }}
            />
          ))}
          <Centre cx="60" cy="60" r="34" />
          <CentreText x="60" y="56">
            {totalCommits}
          </CentreText>
          <CentreSub x="60" y="78">
            commits
          </CentreSub>
        </Svg>
        <Legend>
          {legend.map((s) => (
            <LegendRow key={s.language}>
              <Swatch sx={{ background: s.color }} />
              <LangName>{s.language}</LangName>
              <Share>{Math.round(s.share * 100)}%</Share>
            </LegendRow>
          ))}
        </Legend>
      </Wrap>
    </ActivityCardShell>
  );
}

export default LanguageDonutCard;

const Wrap = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: 16,
  padding: "8px 0",
});

const Svg = styled("svg")({
  width: 120,
  height: 120,
  display: "block",
});

const arcFadeIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
`;

const Arc = styled("path")({
  transformOrigin: "60px 60px",
  animation: `${arcFadeIn} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  'html[data-reduced-motion="true"] &': {
    animation: "none",
  },
});

const Centre = styled("circle")(({ theme }) => ({
  fill: theme.palette.surface.interface.base,
}));

const CentreText = styled("text")(({ theme }) => ({
  textAnchor: "middle",
  fill: theme.palette.text.primary,
  fontSize: 18,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
}));

const CentreSub = styled("text")(({ theme }) => ({
  textAnchor: "middle",
  fill: theme.palette.text.information,
  fontSize: 10,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
}));

const Legend = styled("ul")(({ theme }) => ({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11.5,
  color: theme.palette.text.primary,
}));

const LegendRow = styled("li")({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 8,
});

const Swatch = styled("span")({
  width: 10,
  height: 10,
  borderRadius: 8,
});

const LangName = styled("span")({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const Share = styled("span")(({ theme }) => ({
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));
