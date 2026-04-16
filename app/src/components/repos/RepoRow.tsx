import type { KeyboardEvent } from "react";

import { ExternalLink, FolderOpen, GitBranch, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  PROVIDER_NAMES,
  type Repository,
  formatBranchName,
  formatRelativeTime,
  truncatePath,
} from "@recrest/shared";

import { invoke, openExternal } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface RepoRowProps {
  repo: Repository;
  selected: boolean;
  prCount: number;
}

export function RepoRow({ repo, selected, prCount }: RepoRowProps) {
  const { t } = useTranslation("repos");
  const dispatch = useAppDispatch();

  const statusColor = repo.status.conflicted
    ? "bg-destructive"
    : repo.status.dirty
      ? "bg-warning"
      : "bg-success";

  const statusLabel = t(
    repo.status.conflicted
      ? "status.conflicted"
      : repo.status.dirty
        ? "status.dirty"
        : "status.clean",
  );

  const select = () => dispatch(setSelectedRepo(repo.id));
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={select}
      onKeyDown={onKeyDown}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left",
        "hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-accent",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor)} aria-label={statusLabel} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{repo.name}</span>
          {repo.providerId && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {PROVIDER_NAMES[repo.providerId]}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">{truncatePath(repo.path)}</div>
      </div>

      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <GitBranch className="h-3.5 w-3.5" aria-hidden />
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {formatBranchName(repo.status.branch)}
        </span>
      </div>

      <div className="hidden w-20 text-right text-xs text-muted-foreground tabular-nums md:block">
        {repo.status.ahead > 0 && <span className="text-success">↑{repo.status.ahead} </span>}
        {repo.status.behind > 0 && <span className="text-destructive">↓{repo.status.behind}</span>}
        {!repo.status.ahead && !repo.status.behind && "—"}
      </div>

      <div className="hidden w-14 text-right text-xs text-muted-foreground md:block">
        {prCount > 0 ? t("pr_count", { count: prCount }) : "—"}
      </div>

      <div className="hidden w-28 truncate text-right text-xs text-muted-foreground md:block">
        {repo.status.lastCommit ? formatRelativeTime(repo.status.lastCommit.timestamp) : "—"}
      </div>

      <div
        className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:flex"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <RowAction
          label={t("actions.open_in_ide", { ns: "common" })}
          icon={FolderOpen}
          onClick={() => {
            void invoke("open_in_ide", { repoId: repo.id });
          }}
        />
        <RowAction label={t("actions.open_terminal", { ns: "common" })} icon={Terminal} disabled />
        {repo.remoteUrl && (
          <RowAction
            label={t("actions.open_remote", { ns: "common" })}
            icon={ExternalLink}
            onClick={(remoteUrl) => void openExternal(normalizeRemoteForWeb(remoteUrl))}
            arg={repo.remoteUrl}
          />
        )}
      </div>
    </div>
  );
}

interface RowActionProps<A = void> {
  label: string;
  icon: typeof FolderOpen;
  onClick?: (arg: A) => void;
  arg?: A;
  disabled?: boolean;
}

function RowAction<A>({ label, icon: Icon, onClick, arg, disabled }: RowActionProps<A>) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(arg as A)}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function normalizeRemoteForWeb(remote: string): string {
  if (remote.startsWith("git@")) {
    const match = remote.match(/^git@([^:]+):(.+)$/);
    if (match) {
      const [, host, pathPart] = match;
      if (host && pathPart) {
        return `https://${host}/${pathPart.replace(/\.git$/, "")}`;
      }
    }
  }
  return remote.replace(/\.git$/, "");
}
