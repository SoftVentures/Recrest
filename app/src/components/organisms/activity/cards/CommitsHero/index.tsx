import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import type { WeekPair } from "@/lib/activityStats";

interface Props {
  commits: WeekPair;
  sparkline: number[];
}

export function CommitsHero({ commits, sparkline }: Props) {
  const { t } = useTranslation();
  const dir = commits.delta === 0 ? "flat" : commits.delta > 0 ? "up" : "down";
  const deltaLabel =
    commits.delta === 0
      ? t("activity.kpi.delta_flat")
      : commits.delta > 0
        ? t("activity.kpi.delta_up", { delta: commits.delta })
        : t("activity.kpi.delta_down", { delta: commits.delta });
  const peak = Math.max(1, ...sparkline);
  const last7 = sparkline.slice(0, 7).reverse();
  return (
    <div className="a-act-kpi">
      <div className="a-act-kpi-label">{t("activity.kpi.commits_week")}</div>
      <div className="a-act-kpi-value">{commits.current}</div>
      <div className="a-act-hero-foot">
        <div className="a-act-kpi-spark a-act-anim-spark" aria-hidden>
          {last7.map((v, i) => (
            <span key={i} style={{ height: `${Math.max(10, (v / peak) * 100)}%` }} />
          ))}
        </div>
        <div className={`a-act-kpi-delta tone-${dir}`}>
          {dir === "up" && <Icon name="arrowUp" size={11} />}
          {dir === "down" && <Icon name="arrowDown" size={11} />}
          <span>{deltaLabel}</span>
        </div>
      </div>
    </div>
  );
}
