import { useCallback, useEffect, useMemo } from "react";

import { EventChannel } from "@recrest/shared";

import type { EnrichedRepo } from "@/lib/repoEnrich";
import { listen } from "@/lib/tauri";
import type { BranchesByRepo } from "@/pages/app/Branches/parts/_shared";
import { loadBranches } from "@/store/actions/branches.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Branches for the supplied repos, cached in the Redux `branches` slice so the
 * tab renders instantly on re-entry instead of re-fetching everything each
 * mount. Stale-while-revalidate: cached branches stay visible while a fresh
 * `loadBranches` runs in the background (on mount, on repo-set change, on
 * `REPO_STATUS` events, and on manual `reload()`).
 *
 * `loading` is true only while a load is in flight AND nothing is cached yet
 * for the visible repos — so a re-visit with cached data shows no spinner.
 */
export function useBranchesByRepo(repos: EnrichedRepo[]): {
  data: BranchesByRepo[];
  loading: boolean;
  reload: () => void;
} {
  const dispatch = useAppDispatch();
  const byRepoId = useAppSelector((s) => s.branches.byRepoId);
  const loadingRepoIds = useAppSelector((s) => s.branches.loadingRepoIds);

  const repoIdsKey = useMemo(
    () =>
      repos
        .map((r) => r.id)
        .sort()
        .join("|"),
    [repos],
  );
  // Stable per repo set (the sorted key), so `reload` / the effects don't
  // re-fire on every parent re-render that hands us a new array identity.
  const repoIds = useMemo(() => (repoIdsKey ? repoIdsKey.split("|") : []), [repoIdsKey]);

  // One dispatch per repo → the store fills in (and the UI renders) each group
  // the instant its repo resolves, rather than blocking on the slowest one.
  const reload = useCallback(() => {
    for (const id of repoIds) void dispatch(loadBranches(id));
  }, [dispatch, repoIds]);

  useEffect(() => reload(), [reload]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen<{ repoId: string }>(EventChannel.REPO_STATUS, () => reload());
    })();
    return () => unlisten?.();
  }, [reload]);

  const data = useMemo<BranchesByRepo[]>(
    () => repos.map((repo) => ({ repo, branches: byRepoId[repo.id] ?? [] })),
    [repos, byRepoId],
  );

  const hasCache = repos.some((r) => byRepoId[r.id] !== undefined);
  const loading = loadingRepoIds.length > 0 && !hasCache;

  return { data, loading, reload };
}
