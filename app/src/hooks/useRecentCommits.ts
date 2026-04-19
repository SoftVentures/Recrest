import { useEffect, useState } from "react";

import { type RecentCommit, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  repoId?: string;
  days?: number;
  limit?: number;
}

/** Pulls the last N days of commits from Rust. Refetches whenever the global
 *  `refreshNonce` in `uiSlice` bumps, so the header-refresh button reloads
 *  this data together with `loadRepos`. Returns an empty list outside Tauri. */
export function useRecentCommits({ repoId, days = 14, limit = 500 }: Args = {}): {
  commits: RecentCommit[];
  loading: boolean;
} {
  const [commits, setCommits] = useState<RecentCommit[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  useEffect(() => {
    if (!isTauri()) {
      setCommits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    invoke<RecentCommit[]>(TauriCommand.LIST_RECENT_COMMITS, { repoId, days, limit })
      .then((list) => {
        if (!cancelled) setCommits(list);
      })
      .catch(() => {
        if (!cancelled) setCommits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoId, days, limit, nonce]);

  return { commits, loading };
}
