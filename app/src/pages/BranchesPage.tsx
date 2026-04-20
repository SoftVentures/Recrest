import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { type BranchInfo, EventChannel, TauriCommand } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { BranchRowSkeleton } from "@/components/molecules/skeletons/BranchRowSkeleton";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, listen } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce } from "@/store/slices/uiSlice";

type BranchFilter = "" | "ahead" | "behind" | "clean" | "local" | "remote";

interface BranchesByRepo {
  repo: EnrichedRepo;
  branches: BranchInfo[];
}

/** Loads the real branch list for each repo via the Rust `git_list_branches`
 *  command. Failures on individual repos are swallowed so one broken remote
 *  doesn't empty the whole view. */
function useBranchesByRepo(repos: EnrichedRepo[]): {
  data: BranchesByRepo[];
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<BranchesByRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const results = await Promise.all(
        repos.map(async (repo) => {
          try {
            const branches = await invoke<BranchInfo[]>(TauriCommand.GIT_LIST_BRANCHES, {
              repoId: repo.id,
            });
            return { repo, branches };
          } catch {
            return { repo, branches: [] };
          }
        }),
      );
      if (cancelled) return;
      setData(results);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repos, nonce]);

  // Rescan whenever the backend emits a live status update for any repo the
  // page cares about — matches the hook used by DashboardPage so the counts
  // stay in sync with the sidebar's ahead/behind badges.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen<{ repoId: string }>(EventChannel.REPO_STATUS, () => {
        reload();
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [reload]);

  return { data, loading, reload };
}

export function BranchesPage() {
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<BranchFilter>("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: byRepoAll, loading: branchesLoading, reload } = useBranchesByRepo(repos);

  const run = async (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => {
    setBusyKey(key);
    try {
      await invoke(cmd, args);
      toast.success(okMsg);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
      reload();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : `${cmd} failed`;
      toast.error(msg);
    } finally {
      setBusyKey(null);
    }
  };

  const totals = useMemo(() => {
    let all = 0;
    let ahead = 0;
    let behind = 0;
    let clean = 0;
    let local = 0;
    let remote = 0;
    for (const { branches } of byRepoAll) {
      for (const b of branches) {
        all += 1;
        if (b.ahead > 0) ahead += 1;
        if (b.behind > 0) behind += 1;
        if (b.clean) clean += 1;
        if (b.isRemote) remote += 1;
        else local += 1;
      }
    }
    return { all, ahead, behind, clean, local, remote };
  }, [byRepoAll]);

  const byRepo = useMemo<BranchesByRepo[]>(() => {
    const match = (b: BranchInfo) => {
      if (filter === "ahead") return b.ahead > 0;
      if (filter === "behind") return b.behind > 0;
      if (filter === "clean") return b.clean;
      if (filter === "local") return !b.isRemote;
      if (filter === "remote") return b.isRemote;
      return true;
    };
    return byRepoAll
      .map(({ repo, branches }) => ({ repo, branches: branches.filter(match) }))
      .filter(({ branches }) => branches.length > 0);
  }, [byRepoAll, filter]);

  const showSkeleton =
    (reposLoading || branchesLoading) && byRepoAll.every((g) => g.branches.length === 0);

  return (
    <div className="a-branches" data-testid="branches-page">
      <div className="a-br-filters">
        <BChip active={filter === ""} onClick={() => setFilter("")}>
          {t("branches.filter.all")} <span>{totals.all}</span>
        </BChip>
        <BChip active={filter === "ahead"} onClick={() => setFilter("ahead")}>
          {t("branches.filter.ahead")} <span>{totals.ahead}</span>
        </BChip>
        <BChip active={filter === "behind"} onClick={() => setFilter("behind")}>
          {t("branches.filter.behind")} <span>{totals.behind}</span>
        </BChip>
        <BChip active={filter === "clean"} onClick={() => setFilter("clean")}>
          {t("branches.filter.clean")} <span>{totals.clean}</span>
        </BChip>
        <BChip active={filter === "local"} onClick={() => setFilter("local")}>
          {t("branches.filter.local")} <span>{totals.local}</span>
        </BChip>
        <BChip active={filter === "remote"} onClick={() => setFilter("remote")}>
          {t("branches.filter.remote")} <span>{totals.remote}</span>
        </BChip>
      </div>

      <div className="a-br-groups">
        {showSkeleton && (
          <div className="a-br-group">
            {Array.from({ length: 5 }).map((_, i) => (
              <BranchRowSkeleton key={i} />
            ))}
          </div>
        )}

        {!showSkeleton && byRepo.length === 0 && (
          <div className="a-br-empty">
            {repos.length === 0 ? t("branches.no_repos") : t("branches.empty")}
          </div>
        )}

        {byRepo.map((g) => (
          <div key={g.repo.id} className="a-br-group">
            <div className="a-br-grouph">
              <RepoAvatar repo={g.repo} size={22} radius={5} />
              <div className="a-br-grouph-name">{g.repo.name}</div>
              <div className="a-br-grouph-remote">{g.repo.remoteUrl ?? ""}</div>
              <div className="a-br-grouph-count">
                {g.branches.length} {t("branches.branches")}
              </div>
            </div>
            <div className="a-br-list">
              {g.branches.map((b) => (
                <BranchRow
                  key={(b.isRemote ? `r:${b.remote}/` : "l:") + b.name}
                  repo={g.repo}
                  branch={b}
                  busyKey={busyKey}
                  t={t}
                  run={run}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchRow({
  repo,
  branch: b,
  busyKey,
  t,
  run,
}: {
  repo: EnrichedRepo;
  branch: BranchInfo;
  busyKey: string | null;
  t: (k: string, p?: Record<string, unknown>) => string;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
}) {
  const keyPrefix = `${repo.id}:${b.isRemote ? `${b.remote}/${b.name}` : b.name}`;
  const lastCommitLabel = b.lastCommit
    ? t("branches.last_commit_by", { author: b.lastCommit.author })
    : null;
  return (
    <div className={`a-br-row${b.isCurrent ? " current" : ""}`}>
      <div
        className="a-br-dot"
        data-current={b.isCurrent || undefined}
        data-clean={b.clean || undefined}
        data-remote={b.isRemote || undefined}
      />
      <div className="a-br-name">
        <Icon name="branch" size={13} />
        <span>{b.isRemote ? `${b.remote}/${b.name}` : b.name}</span>
        {b.isCurrent && <span className="a-br-tag">{t("branches.tag.current")}</span>}
        {b.isRemote && <span className="a-br-tag t-remote">{t("branches.tag.remote")}</span>}
        {b.isCurrent && repo.status.dirty && (
          <span className="a-br-tag t-dirty">{t("branches.tag.dirty")}</span>
        )}
        {b.clean && <span className="a-br-tag t-clean">{t("branches.tag.clean")}</span>}
      </div>
      <div className="a-br-meta">
        {!b.isRemote && (
          <span className="a-br-upstream">
            {b.upstream
              ? t("branches.row.upstream_tracking", { upstream: b.upstream })
              : t("branches.row.no_upstream")}
          </span>
        )}
        {lastCommitLabel && <span className="a-br-lastcommit">{lastCommitLabel}</span>}
      </div>
      <div className="a-br-track">
        {b.ahead > 0 && <span className="a-br-trk t-ahead">↑{b.ahead}</span>}
        {b.behind > 0 && <span className="a-br-trk t-behind">↓{b.behind}</span>}
        {b.ahead === 0 && b.behind === 0 && !b.isRemote && (
          <span className="a-br-trk t-even">even</span>
        )}
      </div>
      <div className="a-br-acts">
        {!b.isRemote && b.isCurrent && b.behind > 0 && (
          <button
            type="button"
            className="r-btn sm ghost"
            disabled={busyKey === `${keyPrefix}:pull`}
            onClick={() =>
              void run(
                `${keyPrefix}:pull`,
                "git_pull",
                { repoId: repo.id },
                t("branches.actions.pull"),
              )
            }
          >
            {t("branches.actions.pull")}
          </button>
        )}
        {!b.isRemote && b.isCurrent && b.ahead > 0 && (
          <button
            type="button"
            className="r-btn sm ghost"
            disabled={busyKey === `${keyPrefix}:push`}
            onClick={() =>
              void run(
                `${keyPrefix}:push`,
                "git_push",
                { repoId: repo.id },
                t("branches.actions.push"),
              )
            }
          >
            {t("branches.actions.push")}
          </button>
        )}
        {!b.isCurrent && !b.isRemote && (
          <button
            type="button"
            className="r-btn sm ghost"
            disabled={busyKey === `${keyPrefix}:checkout`}
            onClick={() =>
              void run(
                `${keyPrefix}:checkout`,
                "git_checkout",
                { repoId: repo.id, branch: b.name },
                t("branches.actions.checkout"),
              )
            }
          >
            {t("branches.actions.checkout")}
          </button>
        )}
        {b.isRemote && b.remote && (
          <button
            type="button"
            className="r-btn sm ghost"
            disabled={busyKey === `${keyPrefix}:checkout-remote`}
            onClick={() =>
              void run(
                `${keyPrefix}:checkout-remote`,
                "git_checkout_remote",
                { repoId: repo.id, remote: b.remote, branch: b.name },
                t("branches.actions.checkout_remote"),
              )
            }
          >
            {t("branches.actions.checkout_remote")}
          </button>
        )}
      </div>
    </div>
  );
}

function BChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`a-br-chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
