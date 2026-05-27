import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPullRequests } from "@/store/reducers/prsReducer";

const DEFAULT_POLL_MS = 60_000;

/**
 * Polls pull requests for every connected provider repo on a cadence.
 * Phase 4 ports the polling-interval setting back in; for now we use a
 * conservative 60s default and skip the network entirely outside Tauri's
 * dev stub (per-fetch failures would noise up the console).
 */
export function usePrPolling(): void {
  const dispatch = useAppDispatch();
  const repos = useAppSelector((s) => s.repos.items);
  const connections = useAppSelector((s) => s.providers.connections);

  useEffect(() => {
    const tick = () => {
      for (const repo of Object.values(repos)) {
        if (!repo.providerId) continue;
        if (!connections[repo.providerId]?.connected) continue;
        void dispatch(fetchPullRequests(repo.id));
      }
    };
    tick();
    const handle = window.setInterval(tick, DEFAULT_POLL_MS);
    return () => window.clearInterval(handle);
  }, [dispatch, repos, connections]);
}
