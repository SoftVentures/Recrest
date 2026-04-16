import { useTranslation } from "react-i18next";

import { RepoDetail } from "@/components/repos/RepoDetail";
import { RepoList } from "@/components/repos/RepoList";
import { RepoStats } from "@/components/repos/RepoStats";
import { useRepos } from "@/hooks/useRepos";
import { useAppSelector } from "@/store/hooks";

export function ReposPage() {
  const { t } = useTranslation("repos");
  const repos = useRepos();
  const selectedId = useAppSelector((s) => s.ui.selectedRepoId);
  const loading = useAppSelector((s) => s.repos.loading);
  const error = useAppSelector((s) => s.repos.error);

  const selected = selectedId ? repos.find((r) => r.id === selectedId) : null;

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card p-5">
          <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
          <RepoStats repos={repos} />
        </div>
        {error && (
          <div className="border-b border-destructive bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
        {loading && repos.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("states.loading", { ns: "common" })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <RepoList repos={repos} />
          </div>
        )}
      </div>

      {selected && (
        <div className="hidden w-[400px] shrink-0 overflow-y-auto lg:block">
          <RepoDetail repo={selected} />
        </div>
      )}
    </div>
  );
}
