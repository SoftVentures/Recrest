import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { type PullRequest, TauriCommand } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { Icon } from "@/components/atoms/Icon";
import { Kbd } from "@/components/atoms/Kbd";
import { IconButton, IconLink } from "@/components/molecules/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";
import { FileChangesSkeleton } from "@/components/molecules/skeletons/FileChangesSkeleton";
import { MrListSkeleton } from "@/components/molecules/skeletons/MrListSkeleton";
import { ReviewerChipsSkeleton } from "@/components/molecules/skeletons/ReviewerChipsSkeleton";
import { TimelineEventsSkeleton } from "@/components/molecules/skeletons/TimelineEventsSkeleton";
import { usePrPolling } from "@/hooks/useProviders";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { detailKey, loadPrDetail, resetFilters, setFilters } from "@/store/slices/prsSlice";
import { gitMerge, loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

type MRFilter = "open" | "draft" | "merged" | "closed";

interface Row {
  repoId: string;
  repoName: string;
  pr: PullRequest;
}

export function MergeRequestsPage() {
  const { t } = useTranslation();
  usePrPolling();

  const prsItems = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const filters = useAppSelector((s) => s.prs.filters);
  const prsLoading = useAppSelector((s) => s.prs.loading);
  const dispatch = useAppDispatch();

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const [repoId, prs] of Object.entries(prsItems)) {
      const repoName = repos[repoId]?.name ?? repoId;
      for (const pr of prs) list.push({ repoId, repoName, pr });
    }
    return list;
  }, [prsItems, repos]);

  const [tab, setTab] = useState<MRFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.pr.id ?? null);

  const filtered = useMemo(() => {
    let out = rows;
    // Quick-tab filter (convenience — stacks on top of advanced filters).
    if (tab === "draft") out = out.filter((r) => r.pr.draft);
    else if (tab === "merged") out = out.filter((r) => r.pr.state === "merged");
    else if (tab === "closed") out = out.filter((r) => r.pr.state === "closed");
    else out = out.filter((r) => r.pr.state === "open" && !r.pr.draft);

    // Advanced filters.
    if (filters.ciStatus.length > 0) {
      out = out.filter((r) => r.pr.ciStatus && filters.ciStatus.includes(r.pr.ciStatus));
    }
    if (filters.author && filters.author.trim()) {
      const q = filters.author.trim().toLowerCase();
      out = out.filter((r) => r.pr.author.toLowerCase().includes(q));
    }
    if (filters.draft === "only") out = out.filter((r) => r.pr.draft);
    else if (filters.draft === "hide") out = out.filter((r) => !r.pr.draft);
    return out;
  }, [rows, tab, filters]);

  const counts = useMemo(
    () => ({
      open: rows.filter((r) => r.pr.state === "open" && !r.pr.draft).length,
      draft: rows.filter((r) => r.pr.draft).length,
      merged: rows.filter((r) => r.pr.state === "merged").length,
      closed: rows.filter((r) => r.pr.state === "closed").length,
    }),
    [rows],
  );

  const current = filtered.find((r) => r.pr.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className={`a-mr${current ? " with-drawer" : ""}`}>
      <div className="a-mr-list">
        <div className="a-mr-filter-bar">
          <Chip active={tab === "open"} onClick={() => setTab("open")}>
            {t("mrs.filter.open")} <span className="chip-c">{counts.open}</span>
          </Chip>
          <Chip active={tab === "draft"} onClick={() => setTab("draft")}>
            {t("mrs.filter.draft")} <span className="chip-c">{counts.draft}</span>
          </Chip>
          <Chip active={tab === "merged"} onClick={() => setTab("merged")}>
            {t("mrs.filter.merged")} <span className="chip-c">{counts.merged}</span>
          </Chip>
          <Chip active={tab === "closed"} onClick={() => setTab("closed")}>
            {t("mrs.filter.closed")} <span className="chip-c">{counts.closed}</span>
          </Chip>
          <div style={{ flex: 1 }} />
          <FiltersDropdown />
        </div>
        {prsLoading && rows.length === 0 ? (
          <MrListSkeleton rows={6} />
        ) : (
          <div className="a-mr-rows scroll">
            {filtered.map(({ pr, repoName }) => (
              <button
                type="button"
                key={pr.id}
                className={`a-mr-row${pr.id === current?.pr.id ? " selected" : ""}`}
                onClick={() => setSelectedId(pr.id)}
              >
                <div className="a-mr-row-icon">
                  <Icon name="pr" size={14} color={pr.draft ? "var(--ink-3)" : "var(--green)"} />
                </div>
                <div className="a-mr-row-body">
                  <div className="a-mr-row-title">
                    <span>{pr.title}</span>
                    {pr.draft && <span className="r-badge">draft</span>}
                  </div>
                  <div className="a-mr-row-meta">
                    <BranchChip branch={repoName} size="sm" />
                    <span className="a-mr-sep">·</span>
                    <span>#{pr.number}</span>
                    <span className="a-mr-sep">·</span>
                    <span>{pr.author}</span>
                    {pr.additions != null && pr.deletions != null && (
                      <>
                        <span className="a-mr-sep">·</span>
                        <span className="a-mr-changes">
                          +{pr.additions} −{pr.deletions}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="a-mr-row-right">
                  <CiDot state={ciToDot(pr.ciStatus)} />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div
                style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}
              >
                {t("states.empty")}
                <div style={{ marginTop: 6 }}>
                  <Kbd>⌘K</Kbd>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {current && <MRDrawer row={current} onClose={() => setSelectedId(null)} />}
    </div>
  );
  void dispatch;
}

function FiltersDropdown() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.prs.filters);

  const toggleCi = (ci: "success" | "failure" | "pending" | "running") => {
    const next = filters.ciStatus.includes(ci)
      ? filters.ciStatus.filter((c) => c !== ci)
      : [...filters.ciStatus, ci];
    dispatch(setFilters({ ciStatus: next }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="r-btn sm ghost">
          <Icon name="filter" size={12} /> {t("mrs.filters")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {t("mrs.filter.ci_label", { defaultValue: "CI status" })}
        </DropdownMenuLabel>
        {(["success", "failure", "pending", "running"] as const).map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={(e) => {
              e.preventDefault();
              toggleCi(s);
            }}
          >
            <Checkbox
              checked={filters.ciStatus.includes(s)}
              onCheckedChange={() => toggleCi(s)}
              className="mr-2"
            />
            <span className="capitalize">{s}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          {t("mrs.filter.draft_label", { defaultValue: "Drafts" })}
        </DropdownMenuLabel>
        {(["any", "hide", "only"] as const).map((v) => (
          <DropdownMenuItem
            key={v}
            onSelect={(e) => {
              e.preventDefault();
              dispatch(setFilters({ draft: v }));
            }}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                filters.draft === v ? "bg-primary" : "bg-muted"
              }`}
            />
            <span className="capitalize">{v}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dispatch(resetFilters())}>
          {t("mrs.filter.reset", { defaultValue: "Reset filters" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

interface MRDrawerProps {
  row: Row;
  onClose: () => void;
}
function MRDrawer({ row, onClose }: MRDrawerProps) {
  const { t } = useTranslation();
  const { pr, repoId, repoName } = row;
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
      // Make sure HEAD is on the target branch before merging.
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
    <aside className="a-mr-drawer">
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
          <IconButton tooltip="Close" onClick={onClose}>
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
        <button
          type="button"
          className="r-btn"
          aria-label="Open terminal at repository"
          title="Open terminal at repository"
          onClick={() => void onOpenTerminal()}
          disabled={busy !== null}
        >
          <Icon name="terminal" size={13} />
        </button>
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

      <div className="a-dp-section">
        <div className="a-dp-sec-hdr" style={{ cursor: "default" }}>
          <span className="a-dp-sec-title">
            {t("mrs.drawer.reviewers", { defaultValue: "Reviewers" })}
            {detailSlice && ` (${detailSlice.reviewers.length})`}
          </span>
        </div>
        <div className="a-dp-sec-body">
          {detailLoading && !detailSlice ? (
            <ReviewerChipsSkeleton />
          ) : !detailSlice || detailSlice.reviewers.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
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
        </div>
      </div>

      <div className="a-dp-section">
        <div className="a-dp-sec-hdr" style={{ cursor: "default" }}>
          <span className="a-dp-sec-title">
            {t("mrs.drawer.files", { defaultValue: "Files" })}
            {detailSlice && ` (${detailSlice.files.length})`}
          </span>
        </div>
        <div className="a-dp-sec-body" style={{ maxHeight: 240, overflow: "auto" }}>
          {detailLoading && !detailSlice ? (
            <FileChangesSkeleton rows={4} />
          ) : !detailSlice ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
          ) : detailSlice.files.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
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
      </div>

      <div className="a-dp-section">
        <div className="a-dp-sec-hdr" style={{ cursor: "default" }}>
          <span className="a-dp-sec-title">
            {t("mrs.drawer.timeline", { defaultValue: "Timeline" })}
          </span>
        </div>
        <div className="a-dp-sec-body" style={{ maxHeight: 240, overflow: "auto" }}>
          {detailLoading && !detailSlice ? (
            <TimelineEventsSkeleton rows={4} />
          ) : !detailSlice ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
          ) : detailSlice.timeline.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
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
      </div>

      <div className="a-dp-section">
        <div className="a-dp-sec-hdr" style={{ cursor: "default" }}>
          <span className="a-dp-sec-title">{t("mrs.drawer.meta")}</span>
        </div>
        <div className="a-dp-sec-body">
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
            {t("mrs.drawer.opened_on", { date: pr.createdAt.slice(0, 10) })}
            <br />
            {t("mrs.drawer.updated_on", { date: pr.updatedAt.slice(0, 10) })}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
