import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitPullRequest,
  MinusCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CiStatus, PullRequest } from "@recrest/shared";
import { formatRelativeTime } from "@recrest/shared";

import { openExternal } from "@/lib/tauri";

interface PrRowProps {
  pr: PullRequest;
  repoName: string;
}

export function PrRow({ pr, repoName }: PrRowProps) {
  const { t } = useTranslation("prs");

  return (
    <button
      type="button"
      onClick={() => void openExternal(pr.url)}
      data-testid="mr-row"
      data-mr-number={pr.number}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GitPullRequest
        className={pr.draft ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-primary"}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" data-testid="mr-row-title">
            {pr.title}
          </span>
          {pr.draft && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {t("state.draft")}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {repoName} · #{pr.number} · {pr.author}
        </div>
      </div>

      <CiBadge status={pr.ciStatus} />

      <div className="hidden w-28 text-right text-xs text-muted-foreground md:block">
        {formatRelativeTime(pr.createdAt)}
      </div>

      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
    </button>
  );
}

function CiBadge({ status }: { status: CiStatus | null }) {
  const { t } = useTranslation("prs");
  if (!status || status === "none")
    return (
      <span className="hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
        <MinusCircle className="h-3 w-3" aria-hidden />
        {t("ci.none")}
      </span>
    );

  const map = {
    success: { icon: CheckCircle2, tone: "text-success", label: t("ci.success") },
    failure: { icon: AlertCircle, tone: "text-destructive", label: t("ci.failure") },
    running: { icon: Clock, tone: "text-warning", label: t("ci.running") },
    pending: { icon: Clock, tone: "text-muted-foreground", label: t("ci.pending") },
  } as const;

  const { icon: Icon, tone, label } = map[status];
  return (
    <span className={`hidden items-center gap-1 text-[11px] md:flex ${tone}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
