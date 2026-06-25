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
import { useLocalePrefs, useResolvedLocale } from "@/lib/utils/datetime.utils";
import { weekdayLabel } from "@/lib/utils/locale.utils";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

// Matrix rows are stored Monday-first (row 0=Mon..6=Sun); the display order is
// rotated per the user's week-start preference. `weekdayLabel` indexes by JS
// `getDay()` (0=Sun..6=Sat), so a storage row `r` maps to getDay `(r + 1) % 7`.
const MON_FIRST_ROWS = [0, 1, 2, 3, 4, 5, 6];
const SUN_FIRST_ROWS = [6, 0, 1, 2, 3, 4, 5];
// Nivo only draws ticks at data columns (hours 0..23); we label every 6th hour.
const AXIS_HOURS = ["0", "6", "12", "18"];

function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nivoTheme = useNivoTheme();
  const { show, hide, portal } = useChartTooltip();
  const { weekStart } = useLocalePrefs();
  const locale = useResolvedLocale();
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

  // Build the rows in display order with locale-aware weekday names. The axis
  // uses the short label (compact left gutter); the tooltip uses the long name
  // (`longByShort`) so a hovered cell reads e.g. "Tuesday 09:00".
  const rowOrder = sundayFirst ? SUN_FIRST_ROWS : MON_FIRST_ROWS;
  const shortLabel = (row: number) => weekdayLabel((row + 1) % 7, locale, "short");
  const longLabel = (row: number) => weekdayLabel((row + 1) % 7, locale, "long");
  const data = rowOrder.map((row) => ({
    id: shortLabel(row),
    data: (matrix[row] ?? []).map((count, hour) => ({ x: String(hour), y: count })),
  }));
  const longByShort = new Map(rowOrder.map((row) => [shortLabel(row), longLabel(row)]));

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
          margin={{ top: 4, right: 6, bottom: 26, left: 40 }}
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
              renderTip(
                longByShort.get(String(cell.serieId)) ?? String(cell.serieId),
                String(cell.data.x),
                Number(cell.value ?? 0),
              ),
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

// Fill the card body in both dimensions and reflow on resize (no forceSquare).
// `flex: 1` claims the height the card row gives it (stretches on Activity's
// equal-height rows); `minHeight` keeps a sensible floor on content-sized rows.
const Grid = styled(Box)({
  flex: "1 1 auto",
  minHeight: 180,
  minWidth: 0,
  position: "relative",
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
