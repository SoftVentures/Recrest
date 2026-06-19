import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { WeekStart } from "@recrest/shared";

import { ResponsiveHeatMap } from "@nivo/heatmap";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { useChartTooltip } from "@/components/organisms/activity/cards/parts/ChartTooltip/useChartTooltip";
import type { HeatmapMatrix } from "@/lib/activityAggregates";
import { useNivoTheme } from "@/lib/charts/nivoTheme";
import { fade } from "@/lib/charts/palette";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { useLocalePrefs } from "@/lib/utils/datetime.utils";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

/** Matrix rows are stored Monday-first (index 0=Mon..6=Sun); we keep that
 *  storage invariant and rotate the *display* order based on the user's
 *  week-start preference. */
const WEEKDAYS_MON_FIRST = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const WEEKDAYS_SUN_FIRST = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const AXIS_HOURS = ["0", "6", "12", "18"];

function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const { show, hide, portal } = useChartTooltip();
  const { weekStart } = useLocalePrefs();
  const sundayFirst = weekStart === WeekStart.SUNDAY;
  // Single-metric chart → follow the user's primary color, not a fixed accent.
  const accent = theme.palette.primary.main;

  const renderTip = (weekday: string, hour: string, count: number) => (
    <Tooltip>
      {t("activity.cards.heatmap_tooltip", {
        weekday,
        hour: `${hour.padStart(2, "0")}:00`,
        commits: t("activity.cards.commits_count", { count }),
      })}
    </Tooltip>
  );

  // Reorder Mon-first storage into the display order. When `sundayFirst`, the
  // Sunday row (matrix index 6) jumps to the top; the others follow Mon..Sat.
  const displayLabels = sundayFirst ? WEEKDAYS_SUN_FIRST : WEEKDAYS_MON_FIRST;
  const displayMatrix = sundayFirst ? [matrix[6], ...matrix.slice(0, 6)] : matrix;
  const data = displayMatrix.map((row, weekday) => ({
    id: displayLabels[weekday]!,
    data: (row ?? []).map((count, hour) => ({ x: String(hour), y: count })),
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
          forceSquare
          xInnerPadding={0.18}
          yInnerPadding={0.18}
          colors={{
            type: "quantize",
            // Empty + lowest-activity cells read as a clean neutral grey; only
            // real activity tints orange, ramping to the solid accent at the
            // busy end. No faint orange wash across every cell.
            //
            // Every entry is run through `fade()` so the whole scale is `rgba()`
            // — react-spring interpolates the cell fill on range switch and
            // throws "arity of each output value must be equal" when a hex
            // (`#262935`, one extracted number) animates into an `rgba()` (four).
            // Keeping a single format keeps the arity uniform.
            colors: [
              fade(theme.palette.surface.interface.backElevation, 1),
              fade(accent, 0.45),
              fade(accent, 0.65),
              fade(accent, 0.85),
              fade(accent, 1),
            ],
          }}
          emptyColor={fade(theme.palette.surface.interface.backElevation, 1)}
          enableLabels={false}
          axisTop={null}
          axisBottom={{
            format: (v) => (AXIS_HOURS.includes(String(v)) ? String(v) : ""),
          }}
          borderRadius={2}
          hoverTarget="cell"
          tooltip={() => <></>}
          onMouseMove={(cell, e) =>
            show(
              e.clientX,
              e.clientY,
              renderTip(String(cell.serieId), String(cell.data.x), Number(cell.value ?? 0)),
            )
          }
          onMouseLeave={hide}
        />
        {portal}
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
