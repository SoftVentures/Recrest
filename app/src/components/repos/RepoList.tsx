import { useMemo } from "react";

import { FolderSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Repository } from "@recrest/shared";

import { EmptyState } from "@/components/ui/empty-state";
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
    return (
      <EmptyState
        icon={FolderSearch}
        title={t("empty")}
        description={t("empty_desc")}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="hidden items-center gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground md:flex">
        <span className="w-2" />
        <span className="flex-1">{t("columns.name")}</span>
        <span className="w-40">{t("columns.branch")}</span>
        <span className="w-20 text-right">{t("columns.status")}</span>
        <span className="w-14 text-right">{t("columns.pull_requests")}</span>
        <span className="hidden w-28 text-right lg:block">{t("columns.last_commit")}</span>
        <span className="w-[108px]" />
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
