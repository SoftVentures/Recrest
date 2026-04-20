import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { ActivityStats } from "@/lib/activityStats";

interface Props {
  stats: ActivityStats;
}

export function BusiestPeakCard({ stats }: Props) {
  const { t } = useTranslation();
  return (
    <CardShell title={t("activity.cards.busiest_peak_title")}>
      <div className="a-act-mini-grid">
        <div className="a-act-mini">
          <div className="a-act-mini-label">{t("activity.cards.busiest_label")}</div>
          <div className="a-act-mini-value">
            {stats.busiestDay ? stats.busiestDay.label : t("activity.cadence.none")}
          </div>
          <div className="a-act-mini-sub">
            {stats.busiestDay ? `${stats.busiestDay.count} commits` : ""}
          </div>
        </div>
        <div className="a-act-mini">
          <div className="a-act-mini-label">{t("activity.cards.peak_label")}</div>
          <div className="a-act-mini-value">
            {stats.peakHour ? stats.peakHour.label : t("activity.cadence.none")}
          </div>
          <div className="a-act-mini-sub">
            {stats.peakHour ? `${stats.peakHour.count} commits` : ""}
          </div>
        </div>
      </div>
    </CardShell>
  );
}
