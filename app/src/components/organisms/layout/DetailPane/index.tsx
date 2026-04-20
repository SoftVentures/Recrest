import { type ReactNode, useState } from "react";

import { useNavigate } from "react-router-dom";

import { TauriCommand } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { DiffStat } from "@/components/atoms/DiffStat";
import { Icon } from "@/components/atoms/Icon";
import { IconButton } from "@/components/molecules/IconButton";
import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { RepoAvatar, setRepoLogo } from "@/components/molecules/RepoAvatar";
import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";
import { CreateBranchDialog } from "@/components/organisms/repos/CreateBranchDialog";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { langMeta } from "@/lib/languages";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

interface DetailPaneProps {
  repo: EnrichedRepo;
  onClose: () => void;
}

function Section({
  title,
  meta,
  children,
  defaultOpen = true,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`a-dp-section ${open ? "open" : "closed"}`}>
      <button
        type="button"
        className="a-dp-sec-hdr"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
      >
        <span className="a-dp-sec-chev">
          <Icon name={open ? "chevDown" : "chev"} size={11} />
        </span>
        <span className="a-dp-sec-title">{title}</span>
        {meta && <span className="a-dp-sec-meta">{meta}</span>}
      </button>
      {open && <div className="a-dp-sec-body">{children}</div>}
    </div>
  );
}

function formatRustError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}

export function DetailPane({ repo, onClose }: DetailPaneProps) {
  const meta = langMeta(repo.lang);
  const prs = useAppSelector((s) => s.prs.items);
  const repoPrs = prs[repo.id] ?? [];
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<null | "pull" | "fetch">(null);
  const [branchOpen, setBranchOpen] = useState(false);

  const onLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setRepoLogo(repo.id, reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Per-command busy flag so icon-only buttons can show a spinner and give
  // the user an "it's happening" signal even when the shell command itself
  // returns instantly. Keyed by command name so parallel clicks on different
  // buttons don't fight each other.
  const [cmdBusy, setCmdBusy] = useState<string | null>(null);

  const runCommand = async (
    cmd: import("@recrest/shared").TauriCommandName,
    opts?: { successLabel?: string },
  ) => {
    setCmdBusy(cmd);
    const toastId = toast.loading(opts?.successLabel ?? `Opening…`);
    try {
      await invoke(cmd, { repoId: repo.id });
      toast.success(opts?.successLabel ?? "Opened", { id: toastId });
    } catch (err) {
      toast.error(formatRustError(err, "Command failed"), { id: toastId });
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
    try {
      await invoke(TauriCommand.GIT_FETCH, { repoId: repo.id });
      toast.success("Fetched");
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(formatRustError(err, "Fetch failed"));
    } finally {
      setBusy(null);
    }
  };

  const doPull = async () => {
    setBusy("pull");
    try {
      await invoke(TauriCommand.GIT_PULL, { repoId: repo.id });
      toast.success("Pulled");
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch (err) {
      toast.error(formatRustError(err, "Pull failed"));
    } finally {
      setBusy(null);
    }
  };

  const goToRepoActivity = () => {
    navigate(`/activity?repo=${encodeURIComponent(repo.id)}`);
  };

  return (
    <aside className="a-detail" data-testid="detail-pane" data-repo-id={repo.id}>
      <div className="a-dp-hdr">
        <div className="a-dp-title">
          <label className="a-dp-avatar-wrap" title="Click to set a custom logo">
            <RepoAvatar repo={repo} size={36} radius={8} />
            <span className="a-dp-avatar-edit">
              <Icon name="camera" size={11} />
            </span>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogoUpload(f);
                e.target.value = "";
              }}
            />
          </label>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="a-dp-name">{repo.name}</div>
            <div className="a-dp-path">{repo.path}</div>
            <div className="a-dp-lang">
              <span className="lang-dot" style={{ background: meta.color }} aria-hidden />
              <span>{meta.label}</span>
            </div>
          </div>
        </div>
        <div className="a-dp-hdr-ctrls">
          <IconButton
            tooltip="Expand to fullscreen view"
            onClick={() => navigate(`/repo/${repo.id}`)}
          >
            <Icon name="expand" size={13} />
          </IconButton>
          <IconButton tooltip="Close" onClick={onClose}>
            <Icon name="x" size={14} />
          </IconButton>
        </div>
      </div>

      <div className="a-dp-actions">
        <OpenInIdeButton repoId={repo.id} />
        <IconButton
          tooltip="Open in terminal"
          className="r-btn"
          onClick={() =>
            void runCommand(TauriCommand.OPEN_TERMINAL, { successLabel: "Terminal opened" })
          }
          disabled={cmdBusy !== null}
        >
          <Icon name={cmdBusy === "open_terminal" ? "refresh" : "terminal"} size={13} />
        </IconButton>
        <IconButton
          tooltip="Open in Explorer"
          className="r-btn"
          onClick={() =>
            void runCommand(TauriCommand.OPEN_IN_EXPLORER, { successLabel: "Explorer opened" })
          }
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
      </div>

      <div className="a-dp-branch-card">
        <div className="a-dp-branch-top">
          <BranchChip branch={repo.status.branch ?? repo.name} size="big" />
          <div className="a-dp-ab">
            <span style={{ color: repo.status.ahead ? "var(--green)" : "var(--ink-4)" }}>
              ↑{repo.status.ahead}
            </span>
            <span style={{ color: repo.status.behind ? "var(--amber)" : "var(--ink-4)" }}>
              ↓{repo.status.behind}
            </span>
          </div>
        </div>
        <div className="a-dp-quick">
          <button
            type="button"
            className="r-btn sm"
            onClick={() => void doPull()}
            disabled={busy !== null}
          >
            <Icon name="pull" size={11} /> {busy === "pull" ? "Pulling…" : "Pull"}
          </button>
          <button
            type="button"
            className="r-btn sm"
            onClick={() => void doFetch()}
            disabled={busy !== null}
          >
            <Icon name="refresh" size={11} /> {busy === "fetch" ? "Fetching…" : "Fetch"}
          </button>
          <button
            type="button"
            className="r-btn sm"
            onClick={() => setBranchOpen(true)}
            disabled={busy !== null}
            title="Create a new branch from HEAD"
          >
            <Icon name="plus" size={11} /> Branch
          </button>
        </div>
      </div>
      <CreateBranchDialog open={branchOpen} repoId={repo.id} onClose={() => setBranchOpen(false)} />

      {repo.status.dirty && (
        <Section
          title="Uncommitted"
          meta={
            <>
              <DiffStat added={repo.added} removed={repo.removed} />
              <span className="a-dp-sep">·</span>
              <span>
                {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
              </span>
            </>
          }
        >
          <div className="a-dp-files">
            {repo.status.changedFiles.slice(0, 8).map((f) => (
              <div key={f.path} className="a-dp-file">
                <span className={`a-dp-st a-dp-st-${statusLetter(f.status)}`}>
                  {statusLetter(f.status)}
                </span>
                <span className="a-dp-file-path">{f.path}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Recent commits"
        meta={
          <span
            role="button"
            tabIndex={0}
            className="a-dp-link"
            onClick={(e) => {
              e.stopPropagation();
              goToRepoActivity();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                goToRepoActivity();
              }
            }}
          >
            Log →
          </span>
        }
      >
        <RecentCommitsBody repo={repo} />
      </Section>

      {repoPrs.length > 0 && (
        <Section title="Open merge requests" meta={repoPrs.length} defaultOpen={false}>
          <div className="a-dp-prs">
            {repoPrs.map((p) => (
              <div key={p.id} className="a-dp-pr">
                <Icon name="pr" size={13} color={p.draft ? "var(--ink-3)" : "var(--green)"} />
                <div className="a-dp-pr-body">
                  <div className="a-dp-pr-title">{p.title}</div>
                  <div className="a-dp-pr-meta">
                    #{p.number} · {p.author}
                  </div>
                </div>
                <CiDot state={ciToDot(p.ciStatus)} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}

function RecentCommitsBody({ repo }: { repo: EnrichedRepo }) {
  const { commits, loading } = useRecentCommits({ repoId: repo.id, days: 60, limit: 15 });
  const fallbackSingle = repo.status.lastCommit;

  if (loading && commits.length === 0) {
    return <CommitListSkeleton rows={4} />;
  }
  if (commits.length > 0) {
    return (
      <div className="a-dp-commits">
        {commits.slice(0, 15).map((c) => (
          <div key={c.sha} className="a-dp-commit">
            <span className="avatar sm">{initials(c.author)}</span>
            <div className="a-dp-commit-body">
              <div className="a-dp-commit-msg">{c.summary}</div>
              <div className="a-dp-commit-meta">
                <span className="a-dp-sha">{c.sha.slice(0, 7)}</span>
                <span className="a-dp-sep">·</span>
                <span>{formatWhen(c.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (fallbackSingle) {
    return (
      <div className="a-dp-commits">
        <div className="a-dp-commit">
          <span className="avatar sm">{initials(fallbackSingle.author)}</span>
          <div className="a-dp-commit-body">
            <div className="a-dp-commit-msg">{fallbackSingle.summary}</div>
            <div className="a-dp-commit-meta">
              <span className="a-dp-sha">{fallbackSingle.sha.slice(0, 7)}</span>
              <span className="a-dp-sep">·</span>
              <span>{formatWhen(fallbackSingle.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <div style={{ color: "var(--ink-3)", fontSize: 12 }}>No commits yet.</div>;
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}

function statusLetter(s: string): "M" | "A" | "D" | "R" {
  if (s === "staged") return "M";
  if (s === "untracked") return "A";
  if (s === "conflicted") return "R";
  return "M";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
