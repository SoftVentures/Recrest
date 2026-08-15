import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { LongestGap } from "@/lib/insights";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { fontPxToRem, pxToRem } from "@/theme/scale";

interface Props {
  gap: LongestGap | null;
  loading?: boolean;
}

const Value = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(30),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
}));

const Caption = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

function LongestGapInsightCard({ gap, loading }: Props) {
  const { t } = useTranslation();
  const dt = useDateTimeFormat();
  const value = gap
    ? t("activity.insights.longest_gap_value", { count: gap.days })
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
      <Caption>{gap ? dt.formatRange(gap.startDate, gap.endDate) : ""}</Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(LongestGapInsightCard);
