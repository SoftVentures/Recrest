import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { LongestGap } from "@/lib/insights";

interface Props {
  gap: LongestGap | null;
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

const Caption = styled(Box)(({ theme }) => ({
  marginTop: 4,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

function LongestGapInsightCard({ gap, loading }: Props) {
  const { t } = useTranslation();
  const value = gap
    ? gap.days === 1
      ? t("activity.insights.longest_gap_value_one", { count: gap.days })
      : t("activity.insights.longest_gap_value_other", { count: gap.days })
    : t("activity.insights.empty");
  return (
    <GeneralCard
      title={t("activity.insights.longest_gap_title")}
      sub={t("activity.insights.longest_gap_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.longestGap}
    >
      <Value>{value}</Value>
      <Caption>{gap ? `${gap.startDate} – ${gap.endDate}` : ""}</Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(LongestGapInsightCard);
