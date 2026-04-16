import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import type { Repository } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

import { RepoRow } from "./RepoRow";

interface RepoListProps {
  repos: Repository[];
}

export function RepoList({ repos }: RepoListProps) {
  const { t } = useTranslation("repos");
  const selectedId = useAppSelector((s) => s.ui.selectedRepoId);
  const prsByRepo = useAppSelector((s) => s.prs.items);

  const sorted = useMemo(
    () =>
      [...repos].sort((a, b) => {
        if (a.status.dirty !== b.status.dirty) return a.status.dirty ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [repos],
  );

  if (sorted.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">{t("empty")}</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="w-2" />
        <span className="flex-1">{t("columns.name")}</span>
        <span className="hidden w-40 md:block">{t("columns.branch")}</span>
        <span className="hidden w-20 text-right md:block">{t("columns.status")}</span>
        <span className="hidden w-14 text-right md:block">{t("columns.pull_requests")}</span>
        <span className="hidden w-28 text-right md:block">{t("columns.last_commit")}</span>
        <span className="hidden w-[108px] md:block" />
      </div>

      {sorted.map((repo) => (
        <RepoRow
          key={repo.id}
          repo={repo}
          selected={selectedId === repo.id}
          prCount={prsByRepo[repo.id]?.filter((p) => p.state === "open").length ?? 0}
        />
      ))}
    </div>
  );
}
