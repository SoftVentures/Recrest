import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { Streaks } from "@/lib/insights";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { fontPxToRem, pxToRem } from "@/theme/scale";

interface Props {
  streaks: Streaks;
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

function StreakInsightCard({ streaks, loading }: Props) {
  const { t } = useTranslation();
  const dt = useDateTimeFormat();
  const value = t("activity.insights.streak_value_days", { count: streaks.current });
  const range = streaks.longestRange;
  return (
    <GeneralCard
      title={t("activity.insights.streak_title")}
      sub={t("activity.insights.streak_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.streak}
    >
      <Value>{value}</Value>
      <Caption>
        {streaks.longest > 0 && range
          ? t("activity.insights.streak_longest", {
              count: streaks.longest,
              range: dt.formatRange(range.start, range.end),
            })
          : t("activity.insights.empty")}
      </Caption>
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(StreakInsightCard);
