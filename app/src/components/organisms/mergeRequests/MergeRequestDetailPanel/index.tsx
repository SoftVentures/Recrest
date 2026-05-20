import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { type PullRequest, TauriCommand } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { Button } from "@/components/atoms/Button";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { Icon } from "@/components/atoms/Icon";
import { DetailSection } from "@/components/molecules/DetailSection";
import { IconButton, IconLink } from "@/components/molecules/IconButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { FileChangesSkeleton } from "@/components/molecules/skeletons/FileChangesSkeleton";
import { ReviewerChipsSkeleton } from "@/components/molecules/skeletons/ReviewerChipsSkeleton";
import { TimelineEventsSkeleton } from "@/components/molecules/skeletons/TimelineEventsSkeleton";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { detailKey, loadPrDetail } from "@/store/slices/prsSlice";
import { gitMerge, loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

/**
 * Body of the MR drawer — header, actions, info strip, reviewers, files,
 * timeline, and meta sections. Extracted from `MergeRequestsPage` so the
 * Repo-detail PR drawer (Plan 1 §A.7) can render exactly the same content
 * inline without rebuilding it.
 *
 * The component owns its own busy-state and dispatches a `loadPrDetail`
 * thunk on mount; callers only have to supply the PR + repo identity and
 * a `onClose` callback for the close button.
 */
export interface MergeRequestDetailPanelProps {
  pr: PullRequest;
  repoId: string;
  repoName: string;
  onClose: () => void;
}

// I6: the panel's header used to accept an `extraHeaderActions` slot, but
// the only consumer (RepoDetailPage's PR drawer) injected a textual button
// into a flex-row of 14px icon controls — visually jarring. The contract
// is now to use the parent `<Drawer footer={...}>` slot instead, which the
// Drawer primitive already supports out of the box. If future callers need
// header-level actions, prefer adding a typed slot for icon-only controls
// rather than a free-form ReactNode that lets text bleed in.

export function MergeRequestDetailPanel({
  pr,
  repoId,
  repoName,
  onClose,
}: MergeRequestDetailPanelProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<null | "checkout" | "terminal" | "merge">(null);

  const detailSlice = useAppSelector((s) => s.prs.detail[detailKey(repoId, pr.number)]);
  const detailLoading = useAppSelector(
    (s) => s.prs.detailLoading[detailKey(repoId, pr.number)] ?? false,
  );

  useEffect(() => {
    void dispatch(loadPrDetail({ repoId, prNumber: pr.number }));
  }, [dispatch, repoId, pr.number]);

  const onCheckout = async () => {
    setBusy("checkout");
    const id = toast.loading(`Checking out ${pr.sourceBranch}…`);
    try {
      await invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.sourceBranch });
      toast.success(`Checked out ${pr.sourceBranch}`, { id });
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(String((err as { message?: string })?.message ?? "Checkout failed"), { id });
    } finally {
      setBusy(null);
    }
  };

  const onOpenTerminal = async () => {
    setBusy("terminal");
    const id = toast.loading("Opening terminal…");
    try {
      await invoke(TauriCommand.OPEN_TERMINAL, { repoId });
      toast.success("Terminal opened", { id });
    } catch {
      toast.error("Couldn't open terminal", { id });
    } finally {
      setBusy(null);
    }
  };

  const onMerge = async () => {
    setBusy("merge");
    try {
      await invoke(TauriCommand.GIT_CHECKOUT, { repoId, branch: pr.targetBranch });
      const result = await dispatch(
        gitMerge({
          repoId,
          source: pr.sourceBranch,
          target: pr.targetBranch,
          message: `Merge '${pr.sourceBranch}' into ${pr.targetBranch} (#${pr.number})`,
        }),
      ).unwrap();
      if (result.result.state === "conflicted") {
        toast.error(
          t("mrs.merge.conflict", {
            count: result.result.conflicts.length,
            defaultValue: "Merge left {{count}} conflicts — resolve in your IDE",
          }),
        );
      } else if (result.result.state === "up_to_date") {
        toast.info(t("mrs.merge.uptodate", { defaultValue: "Already up to date" }));
      } else {
        toast.success(
          result.result.state === "fast_forward"
            ? t("mrs.merge.ff", { defaultValue: "Fast-forwarded" })
            : t("mrs.merge.ok", { defaultValue: "Merged" }),
        );
      }
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(String((err as { message?: string })?.message ?? "Merge failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="a-mr-detail" data-testid="mr-detail-panel">
      <div className="a-dp-hdr">
        <div className="a-dp-title" style={{ gap: 10 }}>
          <div className="a-mr-drawer-icon">
            <Icon name="pr" size={18} color={pr.draft ? "var(--ink-3)" : "var(--green)"} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="a-dp-name">{pr.title}</div>
            <div className="a-dp-path">
              <span>#{pr.number}</span>
              <span className="a-dp-sep"> · </span>
              <span>{repoName}</span>
              {pr.draft && (
                <>
                  <span className="a-dp-sep"> · </span>
                  <span className="r-badge">draft</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="a-dp-hdr-ctrls">
          <IconLink href={pr.url} target="_blank" rel="noreferrer" tooltip="Open on host">
            {(() => {
              const brand = brandFromUrl(pr.url);
              return brand ? (
                <BrandIcon slug={brand} size={13} />
              ) : (
                <Icon name="external" size={13} />
              );
            })()}
          </IconLink>
          <IconButton tooltip="Close" onClick={onClose} data-testid="mr-detail-close">
            <Icon name="x" size={14} />
          </IconButton>
        </div>
      </div>

      <div className="a-dp-actions">
        <Button
          size="sm"
          disabled={busy !== null || pr.draft}
          loading={busy === "merge"}
          onClick={() => void onMerge()}
        >
          <Icon name="pr" size={13} /> {t("mrs.actions.merge")}
        </Button>
        <button
          type="button"
          className="r-btn"
          onClick={() => void onCheckout()}
          disabled={busy !== null}
        >
          <Icon name="code" size={13} /> {busy === "checkout" ? "…" : t("mrs.actions.checkout")}
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="r-btn"
              aria-label={t("actions.open_terminal_tooltip", { ns: "repos" })}
              data-testid="mr-row-open-terminal"
              onClick={() => void onOpenTerminal()}
              disabled={busy !== null}
            >
              <Icon name="terminal" size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("actions.open_terminal_tooltip", { ns: "repos" })}</TooltipContent>
        </Tooltip>
      </div>

      <div className="a-mr-strip">
        <div className="a-mr-strip-cell">
          <div className="a-mr-strip-k">{t("mrs.strip.branch")}</div>
          <div className="a-mr-strip-v">
            <BranchChip branch={pr.sourceBranch} size="sm" />
            <span style={{ color: "var(--ink-4)", fontSize: 10, margin: "0 4px" }}>→</span>
            <BranchChip branch={pr.targetBranch} size="sm" />
          </div>
        </div>
        <div className="a-mr-strip-cell">
          <div className="a-mr-strip-k">{t("mrs.strip.changes")}</div>
          <div className="a-mr-strip-v">
            {pr.additions != null && pr.deletions != null
              ? `+${pr.additions} −${pr.deletions}`
              : "—"}
          </div>
        </div>
        <div className="a-mr-strip-cell">
          <div className="a-mr-strip-k">{t("mrs.strip.ci")}</div>
          <div className="a-mr-strip-v">
            <CiDot state={ciToDot(pr.ciStatus)} />
          </div>
        </div>
      </div>

      <div className="a-dp-body">
        <DetailSection
          title={t("mrs.drawer.reviewers", { defaultValue: "Reviewers" })}
          meta={detailSlice ? detailSlice.reviewers.length : undefined}
        >
          {detailLoading && !detailSlice ? (
            <ReviewerChipsSkeleton />
          ) : !detailSlice || detailSlice.reviewers.length === 0 ? (
            <div className="a-dp-empty">{t("mrs.drawer.reviewers_empty")}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detailSlice.reviewers.map((r) => (
                <span
                  key={r.login}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                    r.state === "approved"
                      ? "border-green-500/40 text-green-500"
                      : r.state === "changes_requested"
                        ? "border-destructive/40 text-destructive"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {r.avatarUrl && <img src={r.avatarUrl} alt="" className="h-4 w-4 rounded-full" />}
                  <span>{r.login}</span>
                  <span className="text-[10px] capitalize">{r.state.replace("_", " ")}</span>
                </span>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection
          title={t("mrs.drawer.files", { defaultValue: "Files" })}
          meta={detailSlice ? detailSlice.files.length : undefined}
        >
          <div style={{ maxHeight: 240, overflow: "auto" }}>
            {detailLoading && !detailSlice ? (
              <FileChangesSkeleton rows={4} />
            ) : !detailSlice ? (
              <div className="a-dp-empty">{t("mrs.drawer.files_unavailable")}</div>
            ) : detailSlice.files.length === 0 ? (
              <div className="a-dp-empty">{t("mrs.drawer.files_empty")}</div>
            ) : (
              detailSlice.files.map((f) => (
                <div
                  key={f.path}
                  className="flex items-center justify-between gap-2 border-b border-border/40 py-1 text-xs font-mono last:border-b-0"
                >
                  <span className="truncate">{f.path}</span>
                  <span className="shrink-0 text-[10px]">
                    <span className="text-green-500">+{f.additions}</span>{" "}
                    <span className="text-destructive">−{f.deletions}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </DetailSection>

        <DetailSection
          title={t("mrs.drawer.timeline", { defaultValue: "Timeline" })}
          meta={detailSlice ? detailSlice.timeline.length : undefined}
          defaultOpen={false}
        >
          <div style={{ maxHeight: 240, overflow: "auto" }}>
            {detailLoading && !detailSlice ? (
              <TimelineEventsSkeleton rows={4} />
            ) : !detailSlice ? (
              <div className="a-dp-empty">{t("mrs.drawer.timeline_unavailable")}</div>
            ) : detailSlice.timeline.length === 0 ? (
              <div className="a-dp-empty">{t("mrs.drawer.timeline_empty")}</div>
            ) : (
              detailSlice.timeline.slice(0, 30).map((evt) => (
                <div
                  key={evt.id + evt.at}
                  className="border-b border-border/40 py-1.5 text-xs last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{evt.type.replace("_", " ")}</span>
                    {evt.actor && <span className="text-muted-foreground">· {evt.actor}</span>}
                    <span className="text-muted-foreground">· {evt.at.slice(0, 10)}</span>
                  </div>
                  {evt.body && (
                    <div className="mt-0.5 line-clamp-2 text-muted-foreground">{evt.body}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </DetailSection>

        <DetailSection title={t("mrs.drawer.meta")} defaultOpen={false}>
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
            {t("mrs.drawer.opened_on", { date: pr.createdAt.slice(0, 10) })}
            <br />
            {t("mrs.drawer.updated_on", { date: pr.updatedAt.slice(0, 10) })}
          </div>
        </DetailSection>
      </div>

      <div className="a-dp-footer">
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="r-btn primary a-dp-open-full"
          data-testid="mr-detail-open-host"
        >
          <Icon name="external" size={13} />
          <span>{t("mrs.drawer.open_on_host", { defaultValue: "Open on host" })}</span>
        </a>
      </div>
    </div>
  );
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
