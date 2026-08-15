import { memo, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ResponsivePie } from "@nivo/pie";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import type { LangContributor, LanguageSlice } from "@/lib/activityAggregates";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  mix: LanguageSlice[];
  loading?: boolean;
}

// How many repos to list in the hover breakdown before collapsing the rest.
const MAX_TOOLTIP_CONTRIBUTORS = 4;

const Wrap = styled(Box)({
  display: "grid",
  // Donut takes a clamped fraction of the card WIDTH (never more than ~38%) so
  // the legend always keeps room for its percentage column; the legend fills
  // the rest. `minmax(0, 1fr)` lets the legend track shrink instead of pushing
  // the donut wider and clipping the percentages on a narrow card.
  gridTemplateColumns: "minmax(88px, 38%) minmax(0, 1fr)",
  alignItems: "center",
  gap: pxToRem(16),
  flex: "1 1 auto",
  minHeight: 0,
  height: "100%",
});

// Square donut sized off the available WIDTH (its grid column), kept square via
// aspect-ratio and capped at 200px so it neither collapses nor balloons.
// Width-driven (not height-driven) sizing is what makes the card responsive: a
// narrow card yields a smaller donut and a legible legend, rather than a
// height-derived donut whose fixed width starves the legend's percentage column.
const DonutArea = styled(Box)({
  position: "relative",
  width: "100%",
  maxWidth: pxToRem(200),
  aspectRatio: "1 / 1",
  margin: "0 auto",
  flexShrink: 0,
});

const Centre = styled(Box)({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
});

const CentreValue = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(22),
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}));

const CentreSub = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(9),
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginTop: pxToRem(4),
}));

const LegendList = styled(Box)({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
}) as typeof Box;

const LegendItem = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  gap: pxToRem(8),
  alignItems: "center",
  fontSize: fontPxToRem(11),
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
  width: pxToRem(8),
  height: pxToRem(8),
  borderRadius: 8,
  backgroundColor: color,
  flexShrink: 0,
}));

// TODO(next-pass): unify with parts/ChartTooltip
const Tooltip = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: fontPxToRem(12),
  padding: pxToRems(8, 10),
  color: theme.palette.text.primary,
  minWidth: pxToRem(150),
  maxWidth: pxToRem(240),
}));

const TooltipHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  fontWeight: 600,
  whiteSpace: "nowrap",
});

const TooltipRepos = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(3),
  paddingTop: pxToRem(6),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const RepoRow = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: pxToRem(12),
  fontSize: fontPxToRem(11),
});

const RepoName = styled(Box)(({ theme }) => ({
  color: theme.palette.text.information,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})) as typeof Box;

const RepoPct = styled(Box)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
})) as typeof Box;

const MoreRow = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
}));

/** Merge the per-repo contributor lists of several language slices (used when
 *  the donut folds sub-3% languages into one "Other" wedge) into a single
 *  breakdown, re-weighted by each slice's commit volume. */
function mergeContributors(slices: readonly LanguageSlice[]): LangContributor[] {
  const byRepo = new Map<string, { repoName: string; weight: number }>();
  for (const slice of slices) {
    for (const c of slice.contributors) {
      const w = c.share * slice.commits;
      const existing = byRepo.get(c.repoId);
      if (existing) existing.weight += w;
      else byRepo.set(c.repoId, { repoName: c.repoName, weight: w });
    }
  }
  const total = [...byRepo.values()].reduce((a, b) => a + b.weight, 0) || 1;
  return [...byRepo.entries()]
    .map(([repoId, { repoName, weight }]) => ({ repoId, repoName, share: weight / total }))
    .sort((a, b) => b.share - a.share);
}

function LanguageDonutCard({ mix, loading }: Props) {
  const { t } = useTranslation();
  const nivoTheme = useNivoTheme();
  const { show, hide, portal } = useChartTooltip();
  // Anything under 3% is noise in the donut — fold it into a single "Other"
  // slice. The accumulated share keeps the wheel summing to 100%.
  const TAIL_THRESHOLD = 0.03;
  const legend = useMemo(() => {
    const result: LanguageSlice[] = [];
    const folded: LanguageSlice[] = [];
    for (const slice of mix) {
      if (slice.language === "Other" || slice.share < TAIL_THRESHOLD) {
        folded.push(slice);
        continue;
      }
      result.push(slice);
    }
    if (folded.length > 0) {
      result.push({
        language: folded.length === 1 ? "Other" : `Other (${folded.length})`,
        color: "#8a8a9a",
        share: folded.reduce((a, b) => a + b.share, 0),
        commits: folded.reduce((a, b) => a + b.commits, 0),
        contributors: mergeContributors(folded),
      });
    }
    return result;
  }, [mix]);
  const totalCommits = Math.round(legend.reduce((a, b) => a + b.commits, 0));
  const data = useMemo(
    () =>
      legend.map((s) => ({
        id: s.language,
        value: s.commits,
        color: s.color,
        share: s.share,
        contributors: s.contributors,
      })),
    [legend],
  );
  return (
    <GeneralCard
      title={t("activity.cards.language_title")}
      sub={t("activity.cards.language_sub")}
      loading={loading}
      skeleton="donut"
      testId={TEST_IDS.activity.cards.language}
    >
      <Wrap>
        <DonutArea>
          <ResponsivePie
            data={data}
            theme={nivoTheme}
            // Decorative: the focusable legend <ul> beside it carries the same
            // language breakdown for assistive tech. Without this the Nivo SVG
            // defaults to role="img" with no accessible name → axe svg-img-alt.
            role="presentation"
            colors={{ datum: "data.color" }}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            innerRadius={0.7}
            padAngle={1.5}
            cornerRadius={3}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            tooltip={() => <></>}
            onMouseMove={(datum, e) => {
              const contributors = datum.data.contributors ?? [];
              show(
                e.clientX,
                e.clientY,
                <Tooltip>
                  <TooltipHead>
                    <Swatch color={datum.color} />
                    <Box component="span">
                      {t("activity.cards.language_tooltip", {
                        language: datum.id,
                        percent: Math.round((datum.data.share ?? 0) * 100),
                      })}
                    </Box>
                  </TooltipHead>
                  {contributors.length > 0 && (
                    <TooltipRepos>
                      {contributors.slice(0, MAX_TOOLTIP_CONTRIBUTORS).map((c) => (
                        <RepoRow key={c.repoId}>
                          <RepoName component="span">{c.repoName}</RepoName>
                          <RepoPct component="span">{Math.round(c.share * 100)}%</RepoPct>
                        </RepoRow>
                      ))}
                      {contributors.length > MAX_TOOLTIP_CONTRIBUTORS && (
                        <MoreRow>
                          {t("activity.cards.language_more", {
                            count: contributors.length - MAX_TOOLTIP_CONTRIBUTORS,
                          })}
                        </MoreRow>
                      )}
                    </TooltipRepos>
                  )}
                </Tooltip>,
              );
            }}
            onMouseLeave={hide}
          />
          <Centre>
            <CentreValue>{totalCommits}</CentreValue>
            <CentreSub>{t("activity.cards.commits_label")}</CentreSub>
          </Centre>
        </DonutArea>
        <LegendList component="ul" tabIndex={0} aria-label={t("activity.cards.language_title")}>
          {legend.map((s) => (
            <LegendItem key={s.language} component="li">
              <Swatch color={s.color} />
              <Box component="span">{s.language}</Box>
              <Box component="span">{Math.round(s.share * 100)}%</Box>
            </LegendItem>
          ))}
        </LegendList>
        {portal}
      </Wrap>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(LanguageDonutCard);
