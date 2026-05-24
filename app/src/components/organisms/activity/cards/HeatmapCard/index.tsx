import type { CSSProperties } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import type { HeatmapMatrix } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...matrix.flat());
  return (
    <GeneralCard
      title={t("activity.cards.heatmap_title")}
      sub={t("activity.cards.heatmap_sub")}
      loading={loading}
      skeleton="heatmap"
      testId={TEST_IDS.activity.heatmap.card}
    >
      <Grid data-testid={TEST_IDS.activity.heatmap.root} role="img" aria-label="heatmap">
        {matrix.map((row, dayIdx) => (
          <Row key={dayIdx}>
            <Label variant="caption" component="span" aria-hidden>
              {WEEKDAYS[dayIdx]}
            </Label>
            {row.map((v, hourIdx) => {
              const intensity = v === 0 ? 0 : 0.35 + 0.65 * (v / peak);
              return (
                <GeneralTooltip
                  key={hourIdx}
                  arrow
                  placement="top"
                  title={`${WEEKDAYS[dayIdx]} · ${String(hourIdx).padStart(2, "0")}:00 · ${v}`}
                >
                  <Cell
                    intensity={intensity}
                    style={{ "--cell-delay": dayIdx * 24 + hourIdx } as CSSProperties}
                    data-testid={TEST_IDS.activity.heatmap.cell}
                  />
                </GeneralTooltip>
              );
            })}
          </Row>
        ))}
      </Grid>
      <Foot aria-hidden>
        <Box component="span">00</Box>
        <Box component="span">06</Box>
        <Box component="span">12</Box>
        <Box component="span">18</Box>
        <Box component="span">23</Box>
      </Foot>
    </GeneralCard>
  );
}

export default HeatmapCard;

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

const Label = styled(Typography)(({ theme }) => ({
  fontSize: 9.5,
  color: theme.palette.text.information,
  textAlign: "right",
  paddingRight: 2,
})) as typeof Typography;

const cellFade = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
`;

const Cell = styled(Box, { shouldForwardProp: (p) => p !== "intensity" })<{
  intensity: number;
}>(({ theme, intensity }) => ({
  height: 12,
  borderRadius: 8,
  backgroundColor:
    intensity === 0
      ? theme.palette.surface.interface.backElevation
      : `color-mix(in srgb, ${theme.palette.primary.main} ${intensity * 100}%, ${theme.palette.surface.interface.backElevation})`,
  animation: `${cellFade} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  animationDelay: "calc(var(--cell-delay, 0) * 4ms)",
  'html[data-reduced-motion="true"] &': {
    animation: "none",
  },
}));

const Foot = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  marginTop: 4,
  paddingLeft: 21,
}));
