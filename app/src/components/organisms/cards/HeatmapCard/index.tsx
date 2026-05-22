import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import ActivityCardShell from "@/components/organisms/cards/ActivityCardShell";
import type { HeatmapMatrix } from "@/lib/activityAggregates";

interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/** Wochentag × Stunde heatmap. Mirrors the old `a-act-heatmap` layout: 7
 *  rows, 24 hourly cells, per-cell intensity from 0 (empty) to 1 (peak day-hour),
 *  with a footer showing 5 hour anchors. The cells fade in with a tiny
 *  per-cell stagger so the matrix paints itself on load instead of slamming. */
function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...matrix.flat());
  return (
    <ActivityCardShell
      title={t("activity.cards.heatmap_title", {
        defaultValue: "Commits by weekday × hour",
      })}
      sub={t("activity.cards.heatmap_sub", {
        defaultValue: "Last 14 days, local timezone",
      })}
      loading={loading}
      skeleton="heatmap"
    >
      <Heatmap data-testid="activity-heatmap" role="img" aria-label="heatmap">
        {matrix.map((row, dayIdx) => (
          <Row key={dayIdx}>
            <RowLabel aria-hidden>{WEEKDAYS[dayIdx]}</RowLabel>
            {row.map((v, hourIdx) => {
              const intensity = v === 0 ? 0 : 0.35 + 0.65 * (v / peak);
              return (
                <GeneralTooltip
                  key={hourIdx}
                  title={`${WEEKDAYS[dayIdx]} · ${String(hourIdx).padStart(2, "0")}:00 · ${v}`}
                  placement="top"
                >
                  <Cell
                    data-testid="activity-heatmap-cell"
                    style={
                      {
                        "--intensity": intensity,
                        "--cell-delay": dayIdx * 24 + hourIdx,
                      } as React.CSSProperties
                    }
                  />
                </GeneralTooltip>
              );
            })}
          </Row>
        ))}
      </Heatmap>
      <Foot aria-hidden>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </Foot>
    </ActivityCardShell>
  );
}

export default HeatmapCard;

const Heatmap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 3,
});

const Row = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto repeat(24, 1fr)",
  alignItems: "center",
  gap: 3,
});

const RowLabel = styled("span")(({ theme }) => ({
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
  width: 18,
}));

const cellFade = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
`;

const Cell = styled("div")(({ theme }) => ({
  height: 12,
  minWidth: 0,
  borderRadius: 8,
  // Use `mix` between base + accent driven by --intensity (0..1). Inline
  // style sets the property; the rule below interpolates.
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} calc(var(--intensity, 0) * 100%), ${theme.palette.surface.interface.active})`,
  animation: `${cellFade} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  animationDelay: "calc(var(--cell-delay, 0) * 4ms)",
  'html[data-reduced-motion="true"] &': {
    animation: "none",
  },
}));

const Foot = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "auto repeat(24, 1fr)",
  paddingLeft: 18 + 3, // align with the row labels
  fontSize: 9,
  color: theme.palette.text.information,
  // The footer has 5 anchor labels spread across 24 columns — we place
  // them with manual `gridColumn` so the visual alignment matches the
  // old CSS without re-implementing the spread math.
  "& > span:nth-of-type(1)": { gridColumn: "2 / span 4" },
  "& > span:nth-of-type(2)": { gridColumn: "6 / span 6", textAlign: "left" },
  "& > span:nth-of-type(3)": { gridColumn: "12 / span 6", textAlign: "left" },
  "& > span:nth-of-type(4)": { gridColumn: "18 / span 6", textAlign: "left" },
  "& > span:nth-of-type(5)": { gridColumn: "23 / span 3", textAlign: "right" },
}));
