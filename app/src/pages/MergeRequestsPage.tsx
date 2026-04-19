import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import type { PullRequest } from "@recrest/shared";

import { Icon } from "@/components/icons/Icon";
import { BranchChip, CIDot, type CIState, Kbd } from "@/components/repos/primitives";
import { IconButton, IconLink } from "@/components/ui/IconButton";
import { usePrPolling } from "@/hooks/useProviders";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";
import { useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
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

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const [repoId, prs] of Object.entries(prsItems)) {
      const repoName = repos[repoId]?.name ?? repoId;
      for (const pr of prs) list.push({ repoId, repoName, pr });
    }
    return list;
  }, [prsItems, repos]);

  const [filter, setFilter] = useState<MRFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.pr.id ?? null);

  const filtered = useMemo(() => {
    if (filter === "draft") return rows.filter((r) => r.pr.draft);
    if (filter === "merged") return rows.filter((r) => r.pr.state === "merged");
    if (filter === "closed") return rows.filter((r) => r.pr.state === "closed");
    return rows.filter((r) => r.pr.state === "open" && !r.pr.draft);
  }, [rows, filter]);

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
          <Chip active={filter === "open"} onClick={() => setFilter("open")}>
            {t("mrs.filter.open")} <span className="chip-c">{counts.open}</span>
          </Chip>
          <Chip active={filter === "draft"} onClick={() => setFilter("draft")}>
            {t("mrs.filter.draft")} <span className="chip-c">{counts.draft}</span>
          </Chip>
          <Chip active={filter === "merged"} onClick={() => setFilter("merged")}>
            {t("mrs.filter.merged")} <span className="chip-c">{counts.merged}</span>
          </Chip>
          <Chip active={filter === "closed"} onClick={() => setFilter("closed")}>
            {t("mrs.filter.closed")} <span className="chip-c">{counts.closed}</span>
          </Chip>
          <div style={{ flex: 1 }} />
          <button type="button" className="r-btn sm ghost">
            <Icon name="filter" size={12} /> {t("mrs.filters")}
          </button>
        </div>
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
                <CIDot state={ciToDot(pr.ciStatus)} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
              {t("states.empty")}
              <div style={{ marginTop: 6 }}>
                <Kbd>⌘K</Kbd>
              </div>
            </div>
          )}
        </div>
      </div>

      {current && <MRDrawer row={current} onClose={() => setSelectedId(null)} />}
    </div>
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
  const [busy, setBusy] = useState<null | "checkout" | "terminal">(null);

  const onCheckout = async () => {
    setBusy("checkout");
    try {
      await invoke("git_checkout", { repoId, branch: pr.sourceBranch });
      toast.success(`Checked out ${pr.sourceBranch}`);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Checkout failed";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const onOpenTerminal = async () => {
    setBusy("terminal");
    try {
      await invoke("open_terminal", { repoId });
    } catch {
      toast.error("Couldn't open terminal");
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
          <IconLink href={pr.url} target="_blank" rel="noreferrer" tooltip="Open on GitHub">
            <Icon name="github" size={13} />
          </IconLink>
          <IconButton tooltip="Close" onClick={onClose}>
            <Icon name="x" size={14} />
          </IconButton>
        </div>
      </div>

      <div className="a-dp-actions">
        <button
          type="button"
          className="r-btn primary"
          disabled
          title="Merge is not implemented yet"
        >
          <Icon name="pr" size={13} /> {t("mrs.actions.merge")}
        </button>
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
            <CIDot state={ciToDot(pr.ciStatus)} />
          </div>
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

function ciToDot(s: string | null): CIState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
