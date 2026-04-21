import { useTranslation } from "react-i18next";

import type { PullRequest } from "@recrest/shared";

interface Props {
  prsByRepo: Record<string, readonly PullRequest[]>;
}

export function OpenPrsHero({ prsByRepo }: Props) {
  const { t } = useTranslation();
  let open = 0;
  let draft = 0;
  let review = 0;
  for (const prs of Object.values(prsByRepo)) {
    for (const pr of prs) {
      if (pr.state !== "open") continue;
      open += 1;
      if (pr.draft) draft += 1;
      // Heuristic: any open PR with ≥1 requested reviewer counts as "in review".
      // `PullRequest` in the list shape doesn't carry reviewers yet; fall back
      // to "open minus draft" so the segmented bar stays sensible.
    }
  }
  review = Math.max(0, open - draft);
  const total = Math.max(1, open);
  const pctReview = (review / total) * 100;
  const pctDraft = (draft / total) * 100;
  return (
    <div className="a-act-kpi">
      <div className="a-act-kpi-label">{t("activity.hero.open_prs")}</div>
      <div className="a-act-kpi-value">{open}</div>
      <div className="a-act-segbar" aria-hidden>
        <span className="bg-(--accent)" style={{ flex: pctReview }} />
        <span className="bg-(--ink-4)" style={{ flex: pctDraft }} />
      </div>
      <div className="a-act-segbar-legend">
        <span>
          <span className="a-act-segbar-legend-dot bg-(--accent)" />
          {t("activity.hero.open_prs_sub", { review, draft })}
        </span>
      </div>
    </div>
  );
}
