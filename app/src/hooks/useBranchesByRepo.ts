import { useCallback, useEffect, useMemo, useState } from "react";

import { type BranchInfo, EventChannel, TauriCommand } from "@recrest/shared";

import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, listen } from "@/lib/tauri";
import type { BranchesByRepo } from "@/pages/app/Branches/parts/_shared";

/**
 * Loads `git_list_branches` for every supplied repo in parallel and re-runs on
 * `REPO_STATUS` events so the panel stays current with concurrent git activity.
 *
 * Returns `{ data, loading, reload }` — `reload()` triggers a manual refresh
 * (used after the page issues a fetch/push/pull and wants to surface the new
 * tracking state immediately).
 */
export function useBranchesByRepo(repos: EnrichedRepo[]): {
  data: BranchesByRepo[];
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<BranchesByRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const repoIdsKey = useMemo(
    () =>
      repos
        .map((r) => r.id)
        .sort()
        .join("|"),
    [repos],
  );

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
            return { repo, branches: [] as BranchInfo[] };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoIdsKey, nonce]);

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
