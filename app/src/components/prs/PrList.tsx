import { useMemo } from "react";

import { GitPullRequest } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/ui/empty-state";
import { useAppSelector } from "@/store/hooks";

import { PrRow } from "./PrRow";

export function PrList() {
  const { t } = useTranslation("prs");
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);

  const rows = useMemo(() => {
    const out: { id: string; repoName: string; pr: (typeof prsByRepo)[string][number] }[] = [];
    for (const [repoId, prs] of Object.entries(prsByRepo)) {
      const repo = repos[repoId];
      if (!repo) continue;
      for (const pr of prs.filter((p) => p.state === "open")) {
        out.push({ id: `${repoId}:${pr.id}`, repoName: repo.name, pr });
      }
    }
    out.sort((a, b) => (a.pr.updatedAt < b.pr.updatedAt ? 1 : -1));
    return out;
  }, [prsByRepo, repos]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={GitPullRequest}
        title={t("empty")}
        description={t("empty_desc")}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {rows.map(({ id, repoName, pr }) => (
        <PrRow key={id} pr={pr} repoName={repoName} />
      ))}
    </div>
  );
}
