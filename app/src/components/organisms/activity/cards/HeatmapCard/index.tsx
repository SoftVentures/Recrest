import { useTranslation } from "react-i18next";

import { Box, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { HeatmapMatrix } from "@/lib/activityAggregates";

interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const Grid = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 3,
});

const Row = styled(Box)({
  display: "grid",
  gridTemplateColumns: "18px repeat(24, 1fr)",
  gap: 3,
  alignItems: "center",
});

const Label = styled("span")(({ theme }) => ({
  fontSize: 9.5,
  color: theme.palette.text.information,
  textAlign: "right",
  paddingRight: 2,
}));

const Cell = styled(Box, { shouldForwardProp: (p) => p !== "intensity" })<{
  intensity: number;
}>(({ theme, intensity }) => ({
  height: 12,
  borderRadius: 8,
  backgroundColor:
    intensity === 0
      ? theme.palette.surface.interface.backElevation
      : `color-mix(in srgb, ${theme.palette.primary.main} ${intensity * 100}%, ${theme.palette.surface.interface.backElevation})`,
}));

const Foot = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  marginTop: 4,
  paddingLeft: 21, // align with hour columns (skip the weekday label gutter)
}));

function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...matrix.flat());
  return (
    <GeneralCard
      title={t("activity.cards.heatmap_title", { defaultValue: "Weekday × hour heatmap" })}
      sub={t("activity.cards.heatmap_sub", { defaultValue: "when the team commits" })}
      loading={loading}
      skeleton="heatmap"
      testId="activity-heatmap-card"
    >
      <Grid data-testid="activity-heatmap" role="img" aria-label="heatmap">
        {matrix.map((row, dayIdx) => (
          <Row key={dayIdx}>
            <Label aria-hidden>{WEEKDAYS[dayIdx]}</Label>
            {row.map((v, hourIdx) => {
              const intensity = v === 0 ? 0 : 0.35 + 0.65 * (v / peak);
              return (
                <Tooltip
                  key={hourIdx}
                  arrow
                  placement="top"
                  title={`${WEEKDAYS[dayIdx]} · ${String(hourIdx).padStart(2, "0")}:00 · ${v}`}
                >
                  <Cell intensity={intensity} data-testid="activity-heatmap-cell" />
                </Tooltip>
              );
            })}
          </Row>
        ))}
      </Grid>
      <Foot aria-hidden>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </Foot>
    </GeneralCard>
  );
}

export default HeatmapCard;
