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
    }
  }
  review = Math.max(0, open - draft);
  return (
    <div className="a-act-kpi">
      <div className="a-act-kpi-label">{t("activity.hero.open_prs")}</div>
      <div className="a-act-kpi-value">{open}</div>
      <div className="a-act-kpi-sub">{t("activity.hero.open_prs_sub", { review, draft })}</div>
    </div>
  );
}
