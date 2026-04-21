import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { type BranchInfo, EventChannel, TauriCommand } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
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

/** localStorage key for the branch cache. Values are keyed by repoId so a
 *  repo's cache survives add/remove of other repos. Stale-while-revalidate:
 *  the cached payload paints immediately on reload, the fresh invoke
 *  replaces it once the Rust side has finished scanning. */
const BRANCH_CACHE_KEY = "recrest:branches-cache";

type BranchCache = Record<string, BranchInfo[]>;

function loadBranchCache(): BranchCache {
  try {
    const raw = window.localStorage.getItem(BRANCH_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as BranchCache) : {};
  } catch {
    return {};
  }
}

function saveBranchCache(cache: BranchCache): void {
  try {
    window.localStorage.setItem(BRANCH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota / disabled storage — silent; next invoke still populates the UI.
  }
}

/** Loads the real branch list for each repo via the Rust `git_list_branches`
 *  command. Failures on individual repos are swallowed so one broken remote
 *  doesn't empty the whole view. Seeds `data` from the localStorage cache
 *  on mount so reloads feel instant. */
function useBranchesByRepo(repos: EnrichedRepo[]): {
  data: BranchesByRepo[];
  loading: boolean;
  reload: () => void;
} {
  // Hydrate synchronously from cache so the very first paint already shows
  // the last-known branch list — the subsequent invoke still runs below and
  // replaces the data with fresh values.
  const [data, setData] = useState<BranchesByRepo[]>(() => {
    const cache = loadBranchCache();
    return repos.map((repo) => ({ repo, branches: cache[repo.id] ?? [] }));
  });
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // `useRepos` returns `Object.values(items)` — a fresh array on every render
  // even when the repo set is unchanged. Depending on that reference would
  // re-run the effect every render and, combined with setData, loop forever.
  // Collapse the relevant identity to a stable string (sorted ids) so the
  // effect only re-runs when the repo set actually changes.
  const repoIdsKey = useMemo(() => {
    return repos
      .map((r) => r.id)
      .sort()
      .join("|");
  }, [repos]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cache = loadBranchCache();

    void (async () => {
      const results = await Promise.all(
        repos.map(async (repo) => {
          try {
            const branches = await invoke<BranchInfo[]>(TauriCommand.GIT_LIST_BRANCHES, {
              repoId: repo.id,
            });
            return { repo, branches };
          } catch {
            return { repo, branches: cache[repo.id] ?? [] };
          }
        }),
      );
      if (cancelled) return;
      setData(results);
      setLoading(false);
      // Persist the successful reads — keyed by repoId so removing a repo
      // from the workspace doesn't wipe other entries.
      const next: BranchCache = { ...cache };
      for (const { repo, branches } of results) {
        next[repo.id] = branches;
      }
      saveBranchCache(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoIdsKey, nonce]);

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

  const fetchAllKey = "__all__:fetch";
  const fetchAllBusy = busyKey === fetchAllKey;

  return (
    <div className="a-branches p-branches" data-testid="branches-page">
      <div className="a-br-toolbar">
        <div className="a-br-filters" role="tablist" aria-label={t("branches.filter.label")}>
          <BFilter
            active={filter === ""}
            label={t("branches.filter.all")}
            count={totals.all}
            onClick={() => setFilter("")}
          />
          <BFilter
            active={filter === "ahead"}
            label={t("branches.filter.ahead")}
            count={totals.ahead}
            onClick={() => setFilter("ahead")}
          />
          <BFilter
            active={filter === "behind"}
            label={t("branches.filter.behind")}
            count={totals.behind}
            onClick={() => setFilter("behind")}
          />
          <BFilter
            active={filter === "clean"}
            label={t("branches.filter.clean")}
            count={totals.clean}
            onClick={() => setFilter("clean")}
          />
          <BFilter
            active={filter === "local"}
            label={t("branches.filter.local")}
            count={totals.local}
            onClick={() => setFilter("local")}
          />
          <BFilter
            active={filter === "remote"}
            label={t("branches.filter.remote")}
            count={totals.remote}
            onClick={() => setFilter("remote")}
          />
        </div>
        <button
          type="button"
          className="r-btn sm ghost a-br-fetch-all"
          disabled={fetchAllBusy || repos.length === 0}
          data-testid="branches-fetch-all"
          onClick={() =>
            void run(fetchAllKey, TauriCommand.GIT_FETCH_ALL, {}, t("branches.actions.fetched_all"))
          }
        >
          <Icon name="refresh" size={12} />
          <span>
            {fetchAllBusy ? t("branches.actions.fetching") : t("branches.actions.fetch_all")}
          </span>
        </button>
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

        {byRepo.map((g, gi) => {
          const fetchKey = `${g.repo.id}:fetch`;
          // `--group-base` delays the row stagger so the group itself has
          // popped in (pgZoom, ~80ms * gi) before its rows start rising.
          const groupBaseMs = 200 + gi * 80;
          return (
            <div
              key={g.repo.id}
              className="a-br-group"
              style={
                {
                  "--gi": gi,
                  "--group-base": `${groupBaseMs}ms`,
                } as React.CSSProperties
              }
            >
              <div className="a-br-grouph">
                <RepoAvatar repo={g.repo} size={22} radius={5} />
                <div className="a-br-grouph-name">{g.repo.name}</div>
                <div className="a-br-grouph-remote">{g.repo.remoteUrl ?? ""}</div>
                <div className="a-br-grouph-count">
                  {g.branches.length} {t("branches.branches")}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="r-btn sm ghost a-br-grouph-fetch"
                      disabled={busyKey === fetchKey}
                      aria-label={t("branches.actions.fetch_tooltip")}
                      data-testid="branches-fetch-all"
                      data-repo-id={g.repo.id}
                      onClick={() =>
                        void run(
                          fetchKey,
                          TauriCommand.GIT_FETCH,
                          { repoId: g.repo.id },
                          t("branches.actions.fetched", { repo: g.repo.name }),
                        )
                      }
                    >
                      <Icon name="refresh" size={12} />
                      <span>
                        {busyKey === fetchKey
                          ? t("branches.actions.fetching")
                          : t("branches.actions.fetch")}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t("branches.actions.fetch_tooltip")}</TooltipContent>
                </Tooltip>
              </div>
              <div className="a-br-list">
                {g.branches.map((b, i) => (
                  <BranchRow
                    key={(b.isRemote ? `r:${b.remote}/` : "l:") + b.name}
                    repo={g.repo}
                    branch={b}
                    busyKey={busyKey}
                    t={t}
                    run={run}
                    animIndex={Math.min(i, 10)}
                  />
                ))}
              </div>
            </div>
          );
        })}
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
  animIndex,
}: {
  repo: EnrichedRepo;
  branch: BranchInfo;
  busyKey: string | null;
  t: (k: string, p?: Record<string, unknown>) => string;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  animIndex?: number;
}) {
  const keyPrefix = `${repo.id}:${b.isRemote ? `${b.remote}/${b.name}` : b.name}`;
  const lastCommitLabel = b.lastCommit
    ? t("branches.last_commit_by", { author: b.lastCommit.author })
    : null;
  return (
    <div
      className={`a-br-row${b.isCurrent ? " current" : ""}`}
      style={{ "--i": animIndex ?? 0 } as React.CSSProperties}
    >
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
        <span className="a-br-upstream">
          {b.isRemote
            ? " "
            : b.upstream
              ? t("branches.row.upstream_tracking", { upstream: b.upstream })
              : t("branches.row.no_upstream")}
        </span>
        <span className="a-br-lastcommit">{lastCommitLabel ?? " "}</span>
      </div>
      <div className="a-br-tail">
        <div className="a-br-acts">
          {/* Hidden until row hover so the row stays visually calm; placed
              before the track indicator so once revealed it sits inline
              next to the branch metadata rather than floating at the far
              right. */}
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
              className="r-btn sm primary a-br-checkout"
              disabled={busyKey === `${keyPrefix}:checkout`}
              data-testid="branch-checkout"
              onClick={() =>
                void run(
                  `${keyPrefix}:checkout`,
                  "git_checkout",
                  { repoId: repo.id, branch: b.name },
                  t("branches.actions.checkout"),
                )
              }
            >
              <Icon name="branch" size={11} />
              <span>{t("branches.actions.checkout")}</span>
            </button>
          )}
          {b.isRemote && b.remote && (
            <button
              type="button"
              className="r-btn sm primary a-br-checkout"
              disabled={busyKey === `${keyPrefix}:checkout-remote`}
              data-testid="branch-checkout-remote"
              onClick={() =>
                void run(
                  `${keyPrefix}:checkout-remote`,
                  "git_checkout_remote",
                  { repoId: repo.id, remote: b.remote, branch: b.name },
                  t("branches.actions.checkout_remote"),
                )
              }
            >
              <Icon name="branch" size={11} />
              <span>{t("branches.actions.checkout_remote")}</span>
            </button>
          )}
        </div>
        <div className="a-br-track">
          {b.ahead > 0 && <span className="a-br-trk t-ahead">↑{b.ahead}</span>}
          {b.behind > 0 && <span className="a-br-trk t-behind">↓{b.behind}</span>}
          {b.ahead === 0 && b.behind === 0 && !b.isRemote && (
            <span className="a-br-trk t-even">even</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BFilter({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`a-br-filter-pill${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="a-br-filter-count">{count}</span>
    </button>
  );
}
