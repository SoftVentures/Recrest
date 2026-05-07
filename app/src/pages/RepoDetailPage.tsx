import { useCallback, useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { AppRoute, TauriCommand, formatRelativeTime } from "@recrest/shared";

import { AheadBehind } from "@/components/atoms/AheadBehind";
import { BranchChip } from "@/components/atoms/BranchChip";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { DiffStat } from "@/components/atoms/DiffStat";
import { Icon } from "@/components/atoms/Icon";
import { Skeleton } from "@/components/atoms/Skeleton";
// Sparkline import removed — the activity card no longer renders a redundant
// mini-sparkline under the bar chart.
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { Drawer } from "@/components/molecules/Drawer";
import { EmptyState } from "@/components/molecules/EmptyState";
import { IconButton } from "@/components/molecules/IconButton";
import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";
import { FileChangesSkeleton } from "@/components/molecules/skeletons/FileChangesSkeleton";
import { KpiSkeleton } from "@/components/molecules/skeletons/KpiSkeleton";
import { MrRowSkeleton } from "@/components/molecules/skeletons/MrRowSkeleton";
import { MergeRequestDetailPanel } from "@/components/organisms/mergeRequests/MergeRequestDetailPanel";
import { CreateBranchDialog } from "@/components/organisms/repos/CreateBranchDialog";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { langMeta } from "@/lib/languages";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPullRequests } from "@/store/slices/prsSlice";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

/**
 * Full-width, full-height detail view for a single repository. Reachable via
 * `/repo/:repoId` and from the Expand button in the sidebar DetailPane.
 * Shows everything the small drawer shows, plus more commits, the full
 * changed-file list, and any open pull requests for this repo.
 */
export function RepoDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { repoId } = useParams<{ repoId: string }>();
  const repos = useEnrichedRepos();
  const repo = repos.find((r) => r.id === repoId);

  const prs = useAppSelector((s) => (repoId ? (s.prs.items[repoId] ?? []) : []));
  const prsLoading = useAppSelector((s) => s.prs.loading);
  const connections = useAppSelector((s) => s.providers.connections);
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const reposCount = useAppSelector((s) => Object.keys(s.repos.items).length);

  const { commits, loading: commitsLoading } = useRecentCommits({
    repoId,
    days: 30,
    limit: 50,
  });

  const [busy, setBusy] = useState<null | "pull" | "fetch">(null);
  const [cmdBusy, setCmdBusy] = useState<string | null>(null);
  const [branchOpen, setBranchOpen] = useState(false);
  // Plan 1 §A.7: clicking a PR row used to navigate to the global MR view,
  // ripping the user out of repo context. Now we open a small inline drawer
  // with the PR's basics; "Open in MR view" remains as a deep-link out.
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);

  const repoProviderConnected = !!repo?.providerId && !!connections[repo.providerId]?.connected;

  useEffect(() => {
    if (repoId && repoProviderConnected) void dispatch(fetchPullRequests(repoId));
  }, [dispatch, repoId, repoProviderConnected]);

  useEffect(() => {
    if (repo) document.title = `${repo.name} — Recrest`;
  }, [repo]);

  const goBackToList = useCallback(() => {
    if (repoId) navigate(`/repos/${repoId}`);
    else navigate(AppRoute.REPOS);
  }, [navigate, repoId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tgt = e.target as HTMLElement | null;
      if (tgt?.closest("input, textarea, [contenteditable='true'], [role='dialog']")) return;
      goBackToList();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBackToList]);

  // Distinguish "repos haven't loaded yet" (show skeleton) from "we have
  // repos but this id doesn't match" (show not-found).
  if (!repo && (reposLoading || reposCount === 0)) {
    return <RepoDetailSkeleton />;
  }

  if (!repo) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Icon name="folder" size={32} />
        <span>{t("repo_detail.not_found", { defaultValue: "Repository not found." })}</span>
        <button type="button" className="r-btn" onClick={() => navigate(AppRoute.REPOS)}>
          {t("repo_detail.back_to_list", { defaultValue: "Back to repositories" })}
        </button>
      </div>
    );
  }

  const lang = langMeta(repo.lang);
  const totalCommits = repo.activity.reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(1, ...repo.activity);

  const runCommand = async (cmd: import("@recrest/shared").TauriCommandName, label: string) => {
    setCmdBusy(cmd);
    const id = toast.loading(`Opening ${label}…`);
    try {
      await invoke(cmd, { repoId: repo.id });
      toast.success(`${label} opened`, { id });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? `${label} failed`;
      toast.error(msg, { id });
    } finally {
      setCmdBusy(null);
    }
  };

  const openRemote = () => {
    if (repo.remoteUrl) void openExternal(repo.remoteUrl);
    else toast.error("No remote configured");
  };

  const doFetch = async () => {
    setBusy("fetch");
    const id = toast.loading("Fetching…");
    try {
      await invoke(TauriCommand.GIT_FETCH, { repoId: repo.id });
      toast.success("Fetched", { id });
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Fetch failed", { id });
    } finally {
      setBusy(null);
    }
  };

  const doPull = async () => {
    setBusy("pull");
    const id = toast.loading("Pulling…");
    try {
      await invoke(TauriCommand.GIT_PULL, { repoId: repo.id });
      toast.success("Pulled", { id });
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Pull failed", { id });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CreateBranchDialog open={branchOpen} repoId={repo.id} onClose={() => setBranchOpen(false)} />

      <button
        type="button"
        className="a-page-back"
        onClick={goBackToList}
        data-testid="repo-detail-back"
        aria-label={t("repo_detail.back_aria", { defaultValue: "Back to repositories" })}
      >
        <Icon name="chevLeft" size={12} />
        <span>{t("repo_detail.back_to_list", { defaultValue: "Back to repositories" })}</span>
      </button>

      {/* Header */}
      <header className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
        <RepoAvatar repo={repo} size={64} radius={12} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold leading-tight">{repo.name}</h1>
            {repo.pinned && <Icon name="pin" size={14} color="var(--accent)" />}
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs"
              style={{ color: lang.color }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: lang.color }}
                aria-hidden
              />
              {lang.label}
            </span>
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{repo.path}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <BranchChip branch={repo.status.branch ?? "—"} />
            <AheadBehind ahead={repo.status.ahead} behind={repo.status.behind} />
            {repo.status.dirty ? (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-500">
                {repo.filesChanged} uncommitted
              </span>
            ) : (
              <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-green-500">clean</span>
            )}
            {repo.remoteUrl && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {repo.remoteUrl}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <OpenInIdeButton repoId={repo.id} />
          <IconButton
            tooltip="Open terminal here"
            className="r-btn"
            onClick={() => void runCommand(TauriCommand.OPEN_TERMINAL, "Terminal")}
            disabled={cmdBusy !== null}
          >
            <Icon name={cmdBusy === "open_terminal" ? "refresh" : "terminal"} size={13} />
          </IconButton>
          <IconButton
            tooltip="Open folder in file manager"
            className="r-btn"
            onClick={() => void runCommand(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
            disabled={cmdBusy !== null}
          >
            <Icon name={cmdBusy === "open_in_explorer" ? "refresh" : "folder"} size={13} />
          </IconButton>
          <IconButton
            tooltip={repo.remoteUrl ? "Open on host" : "No remote configured"}
            className="r-btn"
            onClick={openRemote}
            disabled={!repo.remoteUrl}
          >
            {(() => {
              const brand = brandFromUrl(repo.remoteUrl);
              return brand ? (
                <BrandIcon slug={brand} size={13} />
              ) : (
                <Icon name="external" size={13} />
              );
            })()}
          </IconButton>
          <button
            type="button"
            className="r-btn"
            onClick={() => void doPull()}
            disabled={busy !== null}
          >
            <Icon name={busy === "pull" ? "refresh" : "pull"} size={13} />
            {busy === "pull" ? "Pulling…" : "Pull"}
          </button>
          <button
            type="button"
            className="r-btn"
            onClick={() => void doFetch()}
            disabled={busy !== null}
          >
            <Icon name={busy === "fetch" ? "refresh" : "refresh"} size={13} />
            {busy === "fetch" ? "Fetching…" : "Fetch"}
          </button>
          <button
            type="button"
            className="r-btn"
            onClick={() => setBranchOpen(true)}
            disabled={busy !== null}
          >
            <Icon name="plus" size={13} />
            Branch
          </button>
        </div>
      </header>

      {/* KPIs — always four cards; the last one falls back to "Last commit"
          when we aren't connected to a remote provider. */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label={t("repo_detail.kpi.ahead_behind", { defaultValue: "Ahead / Behind" })}
          value={`↑${repo.status.ahead} / ↓${repo.status.behind}`}
        />
        <Kpi
          label={t("repo_detail.kpi.changes", { defaultValue: "Changed lines" })}
          value={
            <span>
              <span className="text-green-500">+{repo.added}</span>{" "}
              <span className="text-destructive">−{repo.removed}</span>
            </span>
          }
          sub={`${repo.filesChanged} files`}
        />
        <Kpi
          label={t("repo_detail.kpi.activity", { defaultValue: "Commits, last 14 days" })}
          value={totalCommits}
          sub={`peak ${maxBucket}/day`}
        />
        {repoProviderConnected ? (
          <Kpi
            label={t("repo_detail.kpi.prs", { defaultValue: "Open merge requests" })}
            value={prs.filter((p) => p.state === "open").length}
            sub={`${prs.filter((p) => p.draft).length} draft`}
          />
        ) : (
          <Kpi
            label={t("repo_detail.kpi.last_commit", { defaultValue: "Last commit" })}
            value={
              repo.status.lastCommit ? formatRelativeTime(repo.status.lastCommit.timestamp) : "—"
            }
            sub={
              repo.status.lastCommit ? (
                <span className="truncate">{repo.status.lastCommit.author}</span>
              ) : undefined
            }
          />
        )}
      </section>

      {/* Grid: activity + uncommitted / prs / commits */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card
          title={t("repo_detail.activity", { defaultValue: "Activity — 14 days" })}
          meta={
            <span>
              {totalCommits} commit{totalCommits === 1 ? "" : "s"} · peak {maxBucket}
            </span>
          }
        >
          <div className="mt-auto flex h-32 w-full items-end gap-1.5">
            {repo.activity.map((v, i) => {
              const label = `${v} commit${v === 1 ? "" : "s"} · ${13 - i} day${13 - i === 1 ? "" : "s"} ago`;
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 rounded-sm"
                      style={{
                        minWidth: 6,
                        height: v > 0 ? `${Math.max(6, (v / maxBucket) * 100)}%` : "4px",
                        background:
                          v === 0
                            ? "rgba(127,127,127,0.18)"
                            : v >= maxBucket * 0.66
                              ? "var(--accent, #4f8cff)"
                              : "rgba(79,140,255,0.55)",
                      }}
                      aria-label={label}
                      data-testid="repo-detail-spark-cell"
                      data-index={i}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>14d ago</span>
            <span>today</span>
          </div>
        </Card>

        <Card
          title={
            repo.status.dirty
              ? t("repo_detail.uncommitted", { defaultValue: "Uncommitted changes" })
              : t("repo_detail.no_changes", { defaultValue: "Working tree" })
          }
          meta={
            repo.status.dirty ? (
              <>
                <DiffStat added={repo.added} removed={repo.removed} />
                <span className="mx-1 text-muted-foreground">·</span>
                <span>
                  {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
                </span>
              </>
            ) : null
          }
        >
          {repo.status.dirty ? (
            <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
              {repo.status.changedFiles.map((f) => {
                const statusLabel = `${f.kind} · ${f.status}`;
                return (
                  <div
                    key={f.path}
                    className="flex items-center justify-between gap-2 border-b border-border/40 py-1 last:border-b-0"
                  >
                    <span className="truncate">{f.path}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] capitalize ${fileKindClasses(f.kind)}`}
                          aria-label={statusLabel}
                          data-testid="repo-detail-file-status"
                        >
                          {f.kind}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{statusLabel}</TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
              {repo.status.changedFilesTruncated && (
                <div className="pt-2 text-center text-[11px] text-muted-foreground">
                  …more files truncated
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              mascot="celebrating"
              mascotSize={88}
              title={t("repo_detail.all_clean", { defaultValue: "Nothing to commit." })}
              className="py-4"
            />
          )}
        </Card>
      </section>

      <section
        className={`grid gap-3 ${repoProviderConnected ? "md:grid-cols-2" : "md:grid-cols-1"}`}
      >
        {repoProviderConnected && (
          <Card
            title={t("repo_detail.prs_title", { defaultValue: "Merge requests" })}
            meta={
              <button
                type="button"
                onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
                className="text-xs text-primary hover:underline"
              >
                {t("repo_detail.all_mrs", { defaultValue: "Open MRs view" })}
              </button>
            }
          >
            {prsLoading && prs.length === 0 ? (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {Array.from({ length: 3 }).map((_, i) => (
                  <MrRowSkeleton key={i} />
                ))}
              </div>
            ) : prs.length === 0 ? (
              <EmptyState
                mascot="snoozing"
                mascotSize={88}
                title={t("repo_detail.no_prs", { defaultValue: "No merge requests fetched." })}
                className="py-4"
              />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {prs.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setSelectedPrId(pr.id)}
                    className="flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition-colors hover:bg-muted/40"
                    aria-pressed={selectedPrId === pr.id}
                    data-testid="repo-detail-pr-row"
                    data-pr-id={pr.id}
                  >
                    <Icon name="pr" size={13} color={pr.draft ? "var(--ink-3)" : "var(--green)"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{pr.title}</span>
                        {pr.draft && (
                          <span className="shrink-0 rounded bg-muted px-1 text-[10px]">draft</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        #{pr.number} · {pr.author} · {pr.sourceBranch} → {pr.targetBranch}
                      </div>
                    </div>
                    <CiDot state={ciToDot(pr.ciStatus)} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card
          title={t("repo_detail.commits_title", { defaultValue: "Recent commits" })}
          meta={<span className="text-xs text-muted-foreground">last 30 days</span>}
        >
          {commitsLoading && commits.length === 0 ? (
            <CommitListSkeleton rows={5} />
          ) : commits.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t("repo_detail.no_commits", { defaultValue: "No commits in the last 30 days." })}
            </div>
          ) : (
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {commits.map((c) => (
                <div
                  key={c.sha}
                  className="flex items-start gap-2.5 border-b border-border/40 py-2 text-xs last:border-b-0"
                >
                  <AuthorAvatar name={c.author} email={c.authorEmail} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.summary || "—"}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{c.author}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(c.timestamp)}</span>
                      <span>·</span>
                      <span className="font-mono">{c.sha.slice(0, 7)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {(() => {
        const selectedPr = selectedPrId ? prs.find((p) => p.id === selectedPrId) : null;
        // I6: the "Open in MR view" textual button used to render via
        // `extraHeaderActions` inside the panel's icon strip — visually
        // inconsistent with the 14px icon controls. Hoist it into the
        // Drawer's `footer` slot so the action button stays distinct from
        // the per-PR controls and matches the Phase 0.2 footer contract.
        return (
          <Drawer
            open={!!selectedPr}
            onClose={() => setSelectedPrId(null)}
            size="lg"
            testId="repo-detail-pr-drawer"
            footer={
              selectedPr ? (
                <button
                  type="button"
                  className="r-btn sm"
                  onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
                  data-testid="repo-detail-pr-open-in-mrs"
                >
                  {t("repo_detail.open_in_mrs", { defaultValue: "Open in MR view" })}
                </button>
              ) : undefined
            }
          >
            {selectedPr && (
              <MergeRequestDetailPanel
                pr={selectedPr}
                repoId={repo.id}
                repoName={repo.name}
                onClose={() => setSelectedPrId(null)}
              />
            )}
          </Drawer>
        );
      })()}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Card({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </div>
  );
}

/**
 * Farbklassen nach Art der Änderung:
 *  - `added`/`renamed`    grün (neu bzw. bewegt)
 *  - `modified`/`typechange` amber (Inhalt/Typ verändert)
 *  - `deleted`            rot (entfernt)
 */
function fileKindClasses(kind: string): string {
  switch (kind) {
    case "deleted":
      return "bg-destructive/10 text-destructive";
    case "added":
    case "renamed":
      return "bg-green-500/10 text-green-500";
    case "modified":
    case "typechange":
      return "bg-amber-500/10 text-amber-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}

/** Full-page skeleton that mirrors the header + KPIs + 2×2 card grid so the
 *  layout doesn't jump once the real repo data lands. */
function RepoDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-10" aria-hidden>
      <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-3 w-72" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-48" />
          <div className="mt-3">
            <FileChangesSkeleton rows={5} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-36" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <MrRowSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-36" />
          <div className="mt-3">
            <CommitListSkeleton rows={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
