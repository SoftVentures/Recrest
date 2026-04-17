import { ExternalLink, FolderOpen, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type Repository, formatBranchName, formatRelativeTime } from "@recrest/shared";

import { ChangedFilesList } from "@/components/repos/ChangedFilesList";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/store/hooks";

interface RepoDetailProps {
  repo: Repository;
}

export function RepoDetail({ repo }: RepoDetailProps) {
  const { t } = useTranslation("repos");
  const prs = useAppSelector((s) => s.prs.items[repo.id] ?? []);
  const changed = repo.status.staged + repo.status.unstaged + repo.status.untracked;

  const runCommand = async (cmd: string) => {
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  return (
    <section className="flex flex-col gap-5 bg-card p-5">
      <header>
        <h2 className="text-lg font-semibold">{repo.name}</h2>
        <p className="truncate text-xs text-muted-foreground" title={repo.path}>
          {repo.path}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void runCommand("open_in_ide")}>
            <FolderOpen aria-hidden />
            {t("actions.open_in_ide", { ns: "common" })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runCommand("open_terminal")}
          >
            <Terminal aria-hidden />
            {t("actions.open_terminal", { ns: "common" })}
          </Button>
          {repo.remoteUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openExternal(repo.remoteUrl!)}
            >
              <ExternalLink aria-hidden />
              {t("actions.open_remote", { ns: "common" })}
            </Button>
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
            repo.status.lastCommit
              ? formatRelativeTime(repo.status.lastCommit.timestamp)
              : "—"
          }
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("detail.changes_title")}</h3>
        <ChangedFilesList
          files={repo.status.changedFiles}
          truncated={repo.status.changedFilesTruncated}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("detail.open_prs")}</h3>
        {prs.filter((p) => p.state === "open").length === 0 ? (
          <EmptyState
            title={t("empty", { ns: "prs" })}
            description={t("detail.open_prs_empty_desc")}
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">
            {prs
              .filter((p) => p.state === "open")
              .map((pr) => (
                <li key={pr.id}>
                  <button
                    type="button"
                    onClick={() => void openExternal(pr.url)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border p-2 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex-1 truncate">{pr.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{pr.author}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(pr.createdAt)}
                    </span>
                  </button>
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
      <div className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}
