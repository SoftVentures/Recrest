import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { ReviewQueueEntry } from "@/lib/activityAggregates";
import { openExternal } from "@/lib/tauri";

interface Props {
  entries: ReviewQueueEntry[];
  loading?: boolean;
}

export function ReviewQueueCard({ entries, loading }: Props) {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("activity.cards.review_queue_title")}
      sub={t("activity.cards.review_queue_sub")}
      loading={loading}
      skeleton="rows"
    >
      {entries.length === 0 ? (
        <div className="a-act-card-empty" data-testid="activity-card-review-queue-empty">
          {t("activity.cards.review_queue_empty")}
        </div>
      ) : (
        <div className="a-act-rq" data-testid="activity-card-review-queue-list">
          {entries.map((e) => {
            const age = Math.round(e.ageDays);
            const ageLabel =
              age === 1
                ? t("activity.cards.age_days_one", { count: age })
                : t("activity.cards.age_days_other", { count: age });
            const open = () => void openExternal(e.url);
            return (
              <button
                type="button"
                key={`${e.repoId}#${e.number}`}
                className="a-act-rq-item"
                onClick={open}
              >
                <span className="a-act-rq-body">
                  <span className="a-act-rq-title">{e.title}</span>
                  <span className="a-act-rq-meta">
                    <span>{e.repoName}</span>
                    <span>·</span>
                    <span>#{e.number}</span>
                    <span>·</span>
                    <span>{e.author}</span>
                  </span>
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`a-act-rq-age${age >= 7 ? " old" : ""}`}>{age}d</span>
                  </TooltipTrigger>
                  <TooltipContent>{ageLabel}</TooltipContent>
                </Tooltip>
              </button>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
