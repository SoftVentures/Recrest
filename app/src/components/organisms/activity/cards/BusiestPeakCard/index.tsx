import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { ActivityStats } from "@/lib/activityStats";

interface Props {
  stats: ActivityStats;
}

const MiniGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
});

const Mini = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
});

const MiniLabel = styled("div")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}));

const MiniValue = styled("div")(({ theme }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.2px",
  fontVariantNumeric: "tabular-nums",
}));

const MiniSub = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
}));

function BusiestPeakCard({ stats }: Props) {
  const { t } = useTranslation();
  const dash = t("activity.cadence.none", { defaultValue: "—" });
  return (
    <GeneralCard
      title={t("activity.cards.busiest_peak_title", { defaultValue: "Busiest & peak" })}
      testId="activity-busiest-peak-card"
    >
      <MiniGrid>
        <Mini>
          <MiniLabel>
            {t("activity.cards.busiest_label", { defaultValue: "Busiest day" })}
          </MiniLabel>
          <MiniValue>{stats.busiestDay ? stats.busiestDay.label : dash}</MiniValue>
          <MiniSub>{stats.busiestDay ? `${stats.busiestDay.count} commits` : ""}</MiniSub>
        </Mini>
        <Mini>
          <MiniLabel>{t("activity.cards.peak_label", { defaultValue: "Peak hours" })}</MiniLabel>
          <MiniValue>{stats.peakHour ? stats.peakHour.label : dash}</MiniValue>
          <MiniSub>{stats.peakHour ? `${stats.peakHour.count} commits` : ""}</MiniSub>
        </Mini>
      </MiniGrid>
    </GeneralCard>
  );
}

export default BusiestPeakCard;
