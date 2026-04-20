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
        <div className="a-act-card-empty">{t("activity.cards.review_queue_empty")}</div>
      ) : (
        <div className="a-act-rq">
          {entries.map((e) => {
            const age = Math.round(e.ageDays);
            const ageLabel =
              age === 1
                ? t("activity.cards.age_days_one", { count: age })
                : t("activity.cards.age_days_other", { count: age });
            const open = () => void openExternal(e.url);
            return (
              <div
                key={`${e.repoId}#${e.number}`}
                className="a-act-rq-item"
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    open();
                  }
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="a-act-rq-title">{e.title}</div>
                  <div className="a-act-rq-meta">
                    <span>{e.repoName}</span>
                    <span>·</span>
                    <span>#{e.number}</span>
                    <span>·</span>
                    <span>{e.author}</span>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`a-act-rq-age${age >= 7 ? " old" : ""}`}>{age}d</div>
                  </TooltipTrigger>
                  <TooltipContent>{ageLabel}</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
