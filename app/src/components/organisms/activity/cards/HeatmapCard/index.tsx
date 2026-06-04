import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { ResponsiveHeatMap } from "@nivo/heatmap";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { HeatmapMatrix } from "@/lib/activityAggregates";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { CHART_PALETTE, fade } from "@/lib/charts/palette";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const AXIS_HOURS = ["0", "6", "12", "18"];
const INDIGO = CHART_PALETTE[0];

function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();

  const data = matrix.map((row, weekday) => ({
    id: WEEKDAYS[weekday]!,
    data: row.map((count, hour) => ({ x: String(hour), y: count })),
  }));

  return (
    <GeneralCard
      title={t("activity.cards.heatmap_title")}
      sub={t("activity.cards.heatmap_sub")}
      loading={loading}
      skeleton="heatmap"
      testId={TEST_IDS.activity.heatmap.card}
    >
      <Grid
        data-testid={TEST_IDS.activity.heatmap.root}
        role="img"
        aria-label={t("repo.heatmap", { ns: I18nNamespace.ARIA })}
      >
        <ResponsiveHeatMap
          data={data}
          theme={nivoTheme}
          margin={{ top: 4, right: 4, bottom: 20, left: 34 }}
          colors={{
            type: "quantize",
            colors: [
              fade(INDIGO, 0.15),
              fade(INDIGO, 0.35),
              fade(INDIGO, 0.55),
              fade(INDIGO, 0.78),
              INDIGO,
            ],
          }}
          emptyColor={fade(theme.palette.divider, 0.15)}
          enableLabels={false}
          axisTop={null}
          axisBottom={{
            format: (v) => (AXIS_HOURS.includes(String(v)) ? String(v) : ""),
          }}
          borderRadius={2}
          hoverTarget="cell"
          tooltip={({ cell }) => (
            <Tooltip>
              {t("activity.cards.heatmap_tooltip", {
                weekday: cell.serieId,
                hour: `${String(cell.data.x).padStart(2, "0")}:00`,
                commits: t("activity.cards.commits_count", {
                  count: Number(cell.value ?? 0),
                }),
              })}
            </Tooltip>
          )}
        />
      </Grid>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout Nivo.
export default memo(HeatmapCard);

const Grid = styled(Box)({
  height: 180,
});

// TODO(next-pass): unify with parts/ChartTooltip
const Tooltip = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));
