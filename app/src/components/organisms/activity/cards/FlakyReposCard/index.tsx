import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { FlakyRepo } from "@/lib/activityAggregates";

interface Props {
  rows: FlakyRepo[];
  loading?: boolean;
}

export function FlakyReposCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("activity.cards.flaky_title")}
      sub={t("activity.cards.flaky_sub")}
      loading={loading}
      skeleton="rows"
    >
      {rows.length === 0 ? (
        <div className="a-act-card-empty">{t("activity.cards.flaky_empty")}</div>
      ) : (
        <div className="a-act-flaky">
          {rows.map((r, i) => (
            <div key={r.repoId} className="a-act-flaky-row">
              <span className="a-act-flaky-name">{r.repoName}</span>
              <span className="a-act-flaky-rate">{Math.round(r.failRate * 100)}%</span>
              <div className="a-act-flaky-bar">
                <div
                  className="a-act-flaky-bar-fill a-act-anim-barh"
                  style={{
                    width: `${Math.max(3, r.failRate * 100)}%`,
                    animationDelay: `${320 + i * 70}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
