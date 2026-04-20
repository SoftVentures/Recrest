import { useEffect, useMemo, useState } from "react";

import { type PrEvent, TauriCommand } from "@recrest/shared";

import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  days?: number;
}

/** Fans out `list_pr_events` to every repo that has a provider assigned and
 *  flattens the result. Refetches on the shared `refreshNonce`. Returns an
 *  empty list outside Tauri. Providers that don't implement PR events yet
 *  return `[]` on the Rust side (default trait impl). */
export function usePrEvents({ days = 14 }: Args = {}): {
  events: PrEvent[];
  loading: boolean;
} {
  const repos = useEnrichedRepos();
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  // `useRepos` returns a fresh array every render, so we lean on the joined
  // id string (stable per repo-set) as the sole array-shaped dependency —
  // otherwise `repos`' reference change would re-run the effect on every
  // render and trigger an update loop.
  const repoKey = useMemo(
    () =>
      repos
        .filter((r) => r.remoteUrl && r.providerId)
        .map((r) => r.id)
        .join(","),
    [repos],
  );

  useEffect(() => {
    if (!isTauri() || repoKey === "") {
      setEvents([]);
      setLoading(false);
      return;
    }
    const repoIds = repoKey.split(",");
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(
      repoIds.map((repoId) => invoke<PrEvent[]>(TauriCommand.LIST_PR_EVENTS, { repoId, days })),
    )
      .then((results) => {
        if (cancelled) return;
        const merged: PrEvent[] = [];
        for (const r of results) {
          if (r.status === "fulfilled") merged.push(...r.value);
        }
        merged.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        setEvents(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoKey, days, nonce]);

  return { events, loading };
}
