import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  weekday: { day: number; count: number } | null;
  loading?: boolean;
}

const Value = styled(Box)(({ theme }) => ({
  fontSize: 30,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.5px",
  lineHeight: 1.1,
}));

const Caption = styled(Box)(({ theme }) => ({
  marginTop: 4,
  fontSize: 11.5,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

// 2024-01-07 is a Sunday, so adding a JS getDay() offset (0=Sun..6=Sat)
// yields a date whose weekday matches that offset — locale-aware label.
function weekdayLabel(day: number, locale: string): string {
  return new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: "long" });
}

function ActiveWeekdayInsightCard({ weekday, loading }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.insights.active_weekday_title")}
      sub={t("activity.insights.active_weekday_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.activeWeekday}
    >
      <Value>
        {weekday ? weekdayLabel(weekday.day, i18n.language) : t("activity.insights.empty")}
      </Value>
      <Caption>{weekday ? `${weekday.count} ${t("activity.commits")}` : ""}</Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(ActiveWeekdayInsightCard);
