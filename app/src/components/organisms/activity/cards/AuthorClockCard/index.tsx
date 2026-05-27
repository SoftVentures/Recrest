import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  hours: number[];
  loading?: boolean;
}

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
});

const Svg = styled("svg")({
  width: 150,
  height: 150,
});

const Foot = styled(Box)(({ theme }) => ({
  textAlign: "center",
  fontSize: 11,
  color: theme.palette.text.information,
  "& > strong": {
    display: "block",
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    marginBottom: 1,
  },
}));

/** 24-segment radial chart — one wedge per hour, radius scaled by commit count. */
function AuthorClockCard({ hours, loading }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const peak = Math.max(1, ...hours);
  const cx = 75;
  const cy = 75;
  const rMax = 62;
  const rMin = 26;
  const wedge = (2 * Math.PI) / 24;
  const scale = (v: number) => (v === 0 ? 0 : Math.sqrt(v / peak));

  const wedgePath = (hour: number, radius: number): string => {
    const a1 = -Math.PI / 2 + hour * wedge;
    const a2 = a1 + wedge * 0.9;
    const x1 = cx + Math.cos(a1) * rMin;
    const y1 = cy + Math.sin(a1) * rMin;
    const x2 = cx + Math.cos(a1) * radius;
    const y2 = cy + Math.sin(a1) * radius;
    const x3 = cx + Math.cos(a2) * radius;
    const y3 = cy + Math.sin(a2) * radius;
    const x4 = cx + Math.cos(a2) * rMin;
    const y4 = cy + Math.sin(a2) * rMin;
    return `M ${x1} ${y1} L ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rMin} ${rMin} 0 0 0 ${x1} ${y1} Z`;
  };

  const total = hours.reduce((a, b) => a + b, 0);
  const peakHour = hours.indexOf(peak);
  const peakLabel =
    total > 0
      ? `${String(peakHour).padStart(2, "0")}:00 · ${Math.round((peak / total) * 100)}%`
      : "—";

  return (
    <GeneralCard
      title={t("activity.cards.clock_title")}
      sub={t("activity.cards.clock_sub")}
      loading={loading}
      skeleton="radial"
      testId={TEST_IDS.activity.cards.authorClock}
    >
      <Wrap>
        <Svg viewBox="0 0 150 150">
          <circle
            cx={cx}
            cy={cy}
            r={rMax}
            fill={theme.palette.surface.interface.backElevation}
            opacity="0.55"
          />
          <circle cx={cx} cy={cy} r={rMin - 2} fill={theme.palette.surface.interface.base} />
          {hours.map((v, h) => {
            const k = scale(v);
            const r = v === 0 ? rMin + 0.5 : rMin + (rMax - rMin) * k;
            const opacity = v === 0 ? 0.12 : 0.55 + 0.45 * k;
            return (
              <path
                key={h}
                d={wedgePath(h, r)}
                fill={theme.palette.primary.main}
                opacity={opacity}
              />
            );
          })}
          {[0, 6, 12, 18].map((h) => {
            const a = -Math.PI / 2 + h * wedge;
            const x = cx + Math.cos(a) * (rMax + 8);
            const y = cy + Math.sin(a) * (rMax + 8);
            return (
              <text
                key={h}
                x={x}
                y={y}
                fontSize="9"
                fill={theme.palette.text.information}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {String(h).padStart(2, "0")}
              </text>
            );
          })}
        </Svg>
        <Foot>
          <Box component="strong">{peakLabel}</Box>
          <Box component="span">{total} commits</Box>
        </Foot>
      </Wrap>
    </GeneralCard>
  );
}

export default AuthorClockCard;
