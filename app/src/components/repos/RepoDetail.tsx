import { ExternalLink, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type Repository, formatBranchName, formatRelativeTime } from "@recrest/shared";

import { invoke, openExternal } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface RepoDetailProps {
  repo: Repository;
}

export function RepoDetail({ repo }: RepoDetailProps) {
  const { t } = useTranslation("repos");
  const prs = useAppSelector((s) => s.prs.items[repo.id] ?? []);
  const changed = repo.status.staged + repo.status.unstaged + repo.status.untracked;

  return (
    <section className="flex flex-col gap-4 border-l border-border bg-card p-5">
      <header>
        <h2 className="text-lg font-semibold">{repo.name}</h2>
        <p className="truncate text-xs text-muted-foreground">{repo.path}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              void invoke("open_in_ide", { repoId: repo.id });
            }}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            {t("actions.open_in_ide", { ns: "common" })}
          </button>
          {repo.remoteUrl && (
            <button
              type="button"
              onClick={() => void openExternal(repo.remoteUrl!)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("actions.open_remote", { ns: "common" })}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("detail.branch")} value={formatBranchName(repo.status.branch)} />
        <StatCard
          label={t("detail.changes")}
          value={changed === 0 ? t("detail.clean") : t("detail.files", { count: changed })}
        />
        <StatCard
          label={t("detail.last_commit")}
          value={
            repo.status.lastCommit ? formatRelativeTime(repo.status.lastCommit.timestamp) : "—"
          }
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("detail.open_prs")}</h3>
        {prs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty", { ns: "prs" })}</p>
        ) : (
          <ul className="space-y-2">
            {prs
              .filter((p) => p.state === "open")
              .map((pr) => (
                <li
                  key={pr.id}
                  className="flex items-center gap-3 rounded-md border border-border p-2 text-sm"
                >
                  <span className="flex-1 truncate">{pr.title}</span>
                  <span className="text-xs text-muted-foreground">{pr.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(pr.createdAt)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}
