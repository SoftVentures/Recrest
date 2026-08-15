import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { Trend } from "@/lib/insights";
import { fontPxToRem, pxToRem } from "@/theme/scale";

interface Props {
  trend: Trend;
  periodDays: number;
  loading?: boolean;
}

type Direction = Trend["direction"];

const Value = styled(Box, { shouldForwardProp: (p) => p !== "direction" })<{
  direction: Direction;
}>(({ theme, direction }) => ({
  fontSize: fontPxToRem(30),
  fontWeight: 700,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
  display: "inline-flex",
  alignItems: "baseline",
  gap: pxToRem(8),
  color:
    direction === "up"
      ? theme.palette.success.main
      : direction === "down"
        ? theme.palette.error.main
        : theme.palette.text.primary,
}));

const Arrow = styled(Box)({
  fontSize: fontPxToRem(22),
  lineHeight: 1,
}) as typeof Box;

const Caption = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
}));

const ARROWS: Record<Direction, string> = { up: "▲", down: "▼", flat: "▶" };
const LABEL_KEYS: Record<Direction, string> = {
  up: "activity.insights.trend_up",
  down: "activity.insights.trend_down",
  flat: "activity.insights.trend_flat",
};

function TrendInsightCard({ trend, periodDays, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.insights.trend_title")}
      sub={t("activity.insights.trend_sub", { days: periodDays })}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.trend}
    >
      <Value direction={trend.direction}>
        <Arrow component="span" aria-hidden>
          {ARROWS[trend.direction]}
        </Arrow>
        {Math.abs(Math.round(trend.deltaPct))}%
      </Value>
      <Caption>{t(LABEL_KEYS[trend.direction])}</Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(TrendInsightCard);
