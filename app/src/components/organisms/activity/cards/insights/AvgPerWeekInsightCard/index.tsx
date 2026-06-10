import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  avg: number;
  loading?: boolean;
}

const Value = styled(Box)(({ theme }) => ({
  fontSize: 30,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
}));

function AvgPerWeekInsightCard({ avg, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.insights.avg_per_week_title")}
      sub={t("activity.insights.avg_per_week_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.avgPerWeek}
    >
      <Value>{avg.toFixed(1)}</Value>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(AvgPerWeekInsightCard);
