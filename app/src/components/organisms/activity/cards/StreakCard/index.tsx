import { useTranslation } from "react-i18next";

interface Props {
  streak: number;
  longest: number;
}

export function StreakCard({ streak, longest }: Props) {
  const { t } = useTranslation();
  const onFire = streak >= 3;
  const label =
    streak === 1
      ? t("activity.kpi.streak_days_one", { count: streak })
      : t("activity.kpi.streak_days_other", { count: streak });
  const bestLabel =
    longest === 1
      ? t("activity.kpi.streak_days_one", { count: longest })
      : t("activity.kpi.streak_days_other", { count: longest });
  return (
    <div className={`a-act-kpi a-act-streak${onFire ? " hot" : ""}`}>
      <div className="a-act-kpi-label">{t("activity.kpi.streak")}</div>
      <div className="a-act-kpi-value">
        {streak}
        {onFire && (
          <span className="a-act-streak-fire" aria-hidden>
            🔥
          </span>
        )}
      </div>
      <div className="a-act-kpi-delta">
        <span>
          {label}
          {longest > streak ? ` · best ${bestLabel}` : ""}
        </span>
      </div>
    </div>
  );
}
