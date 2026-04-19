import { GitBranch, GitPullRequest, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Repository } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

interface RepoStatsProps {
  repos: Repository[];
}

export function RepoStats({ repos }: RepoStatsProps) {
  const { t } = useTranslation("repos");
  const prsByRepo = useAppSelector((s) => s.prs.items);

  const total = repos.length;
  const dirty = repos.filter((r) => r.status.dirty).length;
  const behind = repos.filter((r) => r.status.behind > 0).length;
  const openPrs = Object.values(prsByRepo)
    .flat()
    .filter((p) => p.state === "open").length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label={t("summary.total")} value={total} icon={GitBranch} />
      <StatCard label={t("summary.dirty")} value={dirty} icon={Zap} tone="warning" />
      <StatCard label={t("summary.behind")} value={behind} icon={GitBranch} tone="destructive" />
      <StatCard
        label={t("summary.open_prs")}
        value={openPrs}
        icon={GitPullRequest}
        tone="primary"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof GitBranch;
  tone?: "primary" | "warning" | "destructive";
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-muted ${toneClass}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
