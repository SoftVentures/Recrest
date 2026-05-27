import { useEffect, useState } from "react";

import { type PrEvent, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  repoId?: string;
  days?: number;
}

/** Aggregates PR life-cycle events. The Rust `list_pr_events` command is
 *  per-repo (`repoId` is required, not optional), so when no `repoId` is
 *  passed the hook fans out one invoke per repo in the Redux store and
 *  merges the results. */
export function usePrEvents({ repoId, days = 14 }: Args = {}): {
  events: PrEvent[];
  loading: boolean;
} {
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);
  const reposItems = useAppSelector((s) => s.repos.items);
  const allRepoIds = Object.keys(reposItems);
  const allRepoIdsKey = allRepoIds.join("|");

  useEffect(() => {
    if (!isTauri()) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const ids = repoId ? [repoId] : allRepoIds;
    if (ids.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const calls = ids.map((id) =>
      invoke<PrEvent[]>(TauriCommand.LIST_PR_EVENTS, { repoId: id, days }).catch(
        () => [] as PrEvent[],
      ),
    );

    Promise.all(calls)
      .then((results) => {
        if (cancelled) return;
        setEvents(results.flat());
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, days, allRepoIdsKey, nonce]);

  return { events, loading };
}
