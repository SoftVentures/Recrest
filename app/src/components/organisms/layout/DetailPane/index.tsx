import { type ReactNode, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { BranchChip } from "@/components/atoms/BranchChip";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { DiffStat } from "@/components/atoms/DiffStat";
import { Icon } from "@/components/atoms/Icon";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { IconButton } from "@/components/molecules/IconButton";
import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { RepoAvatar, setRepoLogo } from "@/components/molecules/RepoAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
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
      {/* Header row: the collapse-toggle button on the left, optional meta
       *  on the right as a sibling (not a descendant). Keeping meta outside
       *  the button lets it contain real <button>/<a> elements without
       *  nesting interactives — see the "Log →" link in the Recent Commits
       *  section below. */}
      <div className="a-dp-sec-hdr-row">
        <button
          type="button"
          className="a-dp-sec-hdr"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open ? "true" : "false"}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
        >
          <span className="a-dp-sec-chev">
            <Icon name={open ? "chevDown" : "chev"} size={11} />
          </span>
          <span className="a-dp-sec-title">{title}</span>
        </button>
        {meta && <span className="a-dp-sec-meta">{meta}</span>}
      </div>
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
  const { t } = useTranslation("repos");
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
          <Tooltip>
            <TooltipTrigger asChild>
              <label
                className="a-dp-avatar-wrap"
                aria-label={t("actions.avatar_upload_hint")}
                data-testid="detail-pane-avatar-upload"
              >
                <RepoAvatar repo={repo} size={36} radius={8} />
                <span className="a-dp-avatar-edit">
                  <Icon name="camera" size={11} />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onLogoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>{t("actions.avatar_upload_hint")}</TooltipContent>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <div className="a-dp-name">{repo.name}</div>
            <div className="a-dp-path">{repo.path}</div>
            <div className="a-dp-lang">
              <span className="lang-dot" style={{ background: meta.color }} aria-hidden />
              <span>{meta.label}</span>
            </div>
          </div>
        </div>
        <div className="a-dp-hdr-ctrls">
          <IconButton tooltip={t("detail.close")} onClick={onClose}>
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
            <span className={repo.status.ahead ? "text-(--green)" : "text-(--ink-4)"}>
              ↑{repo.status.ahead}
            </span>
            <span className={repo.status.behind ? "text-(--amber)" : "text-(--ink-4)"}>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="r-btn sm"
                onClick={() => setBranchOpen(true)}
                disabled={busy !== null}
                aria-label={t("actions.create_branch_tooltip")}
                data-testid="detail-pane-create-branch"
              >
                <Icon name="plus" size={11} /> Branch
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("actions.create_branch_tooltip")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <CreateBranchDialog open={branchOpen} repoId={repo.id} onClose={() => setBranchOpen(false)} />

      <div className="a-dp-body">
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
              {repo.status.changedFiles.map((f) => {
                const letter = kindLetter(f.kind);
                return (
                  <div key={f.path} className="a-dp-file">
                    <span className={`a-dp-st a-dp-st-${letter}`}>{letter}</span>
                    <span className="a-dp-file-path">{f.path}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <Section
          title="Recent commits"
          meta={
            <button
              type="button"
              className="a-dp-link"
              onClick={(e) => {
                e.stopPropagation();
                goToRepoActivity();
              }}
            >
              Log →
            </button>
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
      </div>

      <div className="a-dp-footer">
        <button
          type="button"
          className="r-btn primary a-dp-open-full"
          onClick={() => navigate(`/repo/${repo.id}`)}
          data-testid="detail-pane-open-full"
        >
          <Icon name="maximize" size={13} />
          <span>{t("detail.open_full_view")}</span>
        </button>
      </div>
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
            <AuthorAvatar name={c.author} email={c.authorEmail ?? null} size={24} />
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
          <AuthorAvatar name={fallbackSingle.author} size={24} />
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
  return <div className="text-xs text-muted-foreground">No commits yet.</div>;
}

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}

/** Three semantic buckets, mapped to the `.a-dp-st-*` letter badges:
 *  A=green (new files), M=amber (changes — modified, renamed, typechange),
 *  D=red (deletions). Renamed collapses into "changes" because users
 *  reading the list care about *what colour means risk*, not about the
 *  nuance between a rename and an edit. */
function kindLetter(kind: string): "M" | "A" | "D" {
  if (kind === "added") return "A";
  if (kind === "deleted") return "D";
  return "M";
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
