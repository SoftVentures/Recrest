import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import { colorForRepo } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";

interface Props {
  quietestRepoIds: string[];
  reposById: Map<string, EnrichedRepo>;
}

export function QuietestReposCard({ quietestRepoIds, reposById }: Props) {
  const { t } = useTranslation();
  return (
    <CardShell title={t("activity.cadence.quietest")}>
      {quietestRepoIds.length === 0 ? (
        <div className="a-act-card-empty">{t("activity.cadence.quietest_none")}</div>
      ) : (
        <span className="a-act-cad-quiet">
          {quietestRepoIds.slice(0, 8).map((id) => {
            const r = reposById.get(id);
            return (
              <span key={id} className="a-act-cad-quiet-chip">
                <span className="a-act-cad-quiet-dot" style={{ background: colorForRepo(id) }} />
                {r?.name ?? id}
              </span>
            );
          })}
          {quietestRepoIds.length > 8 && (
            <span className="a-act-cad-quiet-more">+{quietestRepoIds.length - 8}</span>
          )}
        </span>
      )}
    </CardShell>
  );
}
