import { memo, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ResponsivePie } from "@nivo/pie";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import type { LanguageSlice } from "@/lib/activityAggregates";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  mix: LanguageSlice[];
  loading?: boolean;
}

const Wrap = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: 16,
});

const DonutArea = styled(Box)({
  position: "relative",
  width: 120,
  height: 120,
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
  fontSize: 22,
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}));

const CentreSub = styled(Box)(({ theme }) => ({
  fontSize: 9,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginTop: 4,
}));

const LegendList = styled(Box)({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 4,
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

// TODO(next-pass): unify with parts/ChartTooltip
const Tooltip = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));

function LanguageDonutCard({ mix, loading }: Props) {
  const { t } = useTranslation();
  const nivoTheme = useNivoTheme();
  const { show, hide, portal } = useChartTooltip();
  // Anything under 3% is noise in the donut — fold it into a single "Other"
  // slice. The accumulated share keeps the wheel summing to 100%.
  const TAIL_THRESHOLD = 0.03;
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
  const data = useMemo(
    () => legend.map((s) => ({ id: s.language, value: s.commits, color: s.color, share: s.share })),
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
            onMouseMove={(datum, e) =>
              show(
                e.clientX,
                e.clientY,
                <Tooltip>
                  <Swatch color={datum.color} />
                  <Box component="span">
                    {t("activity.cards.language_tooltip", {
                      language: datum.id,
                      percent: Math.round((datum.data.share ?? 0) * 100),
                    })}
                  </Box>
                </Tooltip>,
              )
            }
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
