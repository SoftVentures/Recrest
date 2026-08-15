import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { useResolvedLocale } from "@/lib/utils/datetime.utils";
import { weekdayLabel } from "@/lib/utils/locale.utils";
import { fontPxToRem, pxToRem } from "@/theme/scale";

interface Props {
  weekday: { day: number; count: number } | null;
  loading?: boolean;
}

const Value = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(30),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
}));

const Caption = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

function ActiveWeekdayInsightCard({ weekday, loading }: Props) {
  const { t } = useTranslation();
  const locale = useResolvedLocale();
  return (
    <GeneralCard
      title={t("activity.insights.active_weekday_title")}
      sub={t("activity.insights.active_weekday_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.activeWeekday}
    >
      <Value>{weekday ? weekdayLabel(weekday.day, locale) : t("activity.insights.empty")}</Value>
      <Caption>{weekday ? `${weekday.count} ${t("activity.commits")}` : ""}</Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(ActiveWeekdayInsightCard);
