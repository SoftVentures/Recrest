import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
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

const Wrap = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: 16,
});

const Svg = styled("svg")({
  width: 120,
  height: 120,
  flexShrink: 0,
});

const Centre = styled("text")(({ theme }) => ({
  textAnchor: "middle",
  fontSize: 22,
  fontWeight: 700,
  fill: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
}));

const CentreSub = styled("text")(({ theme }) => ({
  textAnchor: "middle",
  fontSize: 9,
  fill: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}));

const LegendList = styled("ul")({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxHeight: 180,
  overflowY: "auto",
});

const LegendItem = styled("li")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  gap: 8,
  alignItems: "center",
  fontSize: 11,
  color: theme.palette.text.primary,
  "& > span:last-of-type": {
    color: theme.palette.text.information,
    fontVariantNumeric: "tabular-nums",
  },
}));

const Swatch = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: 8,
  backgroundColor: color,
}));

function LanguageDonutCard({ mix, loading }: Props) {
  const { t } = useTranslation();
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
  const totalCommits = Math.round(legend.reduce((a, b) => a + b.commits, 0));
  const arcs = useMemo(() => donutArcs(legend, 48, 60, 60), [legend]);
  return (
    <GeneralCard
      title={t("activity.cards.language_title", { defaultValue: "Language mix" })}
      sub={t("activity.cards.language_sub", { defaultValue: "weighted by commits" })}
      loading={loading}
      skeleton="donut"
      testId="activity-language-card"
    >
      <Wrap>
        <Svg viewBox="0 0 120 120">
          {arcs.map((a) => (
            <path key={a.slice.language} d={a.path} fill={a.slice.color} />
          ))}
          <circle cx="60" cy="60" r="34" fill="var(--mui-palette-surface-interface-base, white)" />
          <Centre x="60" y="58">
            {totalCommits}
          </Centre>
          <CentreSub x="60" y="78">
            commits
          </CentreSub>
        </Svg>
        <LegendList>
          {legend.map((s) => (
            <LegendItem key={s.language}>
              <Swatch color={s.color} />
              <span>{s.language}</span>
              <span>{Math.round(s.share * 100)}%</span>
            </LegendItem>
          ))}
        </LegendList>
      </Wrap>
    </GeneralCard>
  );
}

export default LanguageDonutCard;
