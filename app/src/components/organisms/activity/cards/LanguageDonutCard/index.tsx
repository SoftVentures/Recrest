import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { keyframes, styled, useTheme } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { LanguageSlice } from "@/lib/activityAggregates";
import { donutArcs } from "@/lib/charts/donutArcs";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  mix: LanguageSlice[];
  loading?: boolean;
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

const LegendList = styled(Box)({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxHeight: 180,
  overflowY: "auto",
}) as typeof Box;

const LegendItem = styled(Box)(({ theme }) => ({
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
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
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
  const theme = useTheme();
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
      title={t("activity.cards.language_title")}
      sub={t("activity.cards.language_sub")}
      loading={loading}
      skeleton="donut"
      testId={TEST_IDS.activity.cards.language}
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
          <circle cx="60" cy="60" r="34" fill={theme.palette.surface.interface.base} />
          <Centre x="60" y="58">
            {totalCommits}
          </Centre>
          <CentreSub x="60" y="78">
            commits
          </CentreSub>
        </Svg>
        <LegendList component="ul">
          {legend.map((s) => (
            <LegendItem key={s.language} component="li">
              <Swatch color={s.color} />
              <Box component="span">{s.language}</Box>
              <Box component="span">{Math.round(s.share * 100)}%</Box>
            </LegendItem>
          ))}
        </LegendList>
      </Wrap>
    </GeneralCard>
  );
}

export default LanguageDonutCard;
