import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { ChurnRow } from "@/lib/activityAggregates";

interface Props {
  rows: ChurnRow[];
  loading?: boolean;
}

export function ChurnCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...rows.map((r) => r.total));
  return (
    <CardShell
      title={t("activity.cards.churn_title")}
      sub={t("activity.cards.churn_sub")}
      loading={loading}
      skeleton="rows"
    >
      {rows.length === 0 ? (
        <div className="a-act-card-empty">—</div>
      ) : (
        <div className="a-act-churn">
          {rows.map((r) => {
            const widthPct = (r.total / peak) * 100;
            const addedPct = r.total === 0 ? 0 : (r.added / r.total) * widthPct;
            const removedPct = r.total === 0 ? 0 : (r.removed / r.total) * widthPct;
            return (
              <div key={r.repoId} className="a-act-churn-row">
                <span className="a-act-churn-name">{r.repoName}</span>
                <span className="a-act-churn-nums">
                  +{r.added} −{r.removed}
                </span>
                <div className="a-act-churn-bar a-act-anim-barh">
                  <span className="a-act-churn-added" style={{ width: `${addedPct}%` }} />
                  <span className="a-act-churn-removed" style={{ width: `${removedPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
