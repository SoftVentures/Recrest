import { useEffect, useMemo, useRef } from "react";

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

  // Read the live maps from refs inside `tick` so the effect doesn't have to
  // list `repos`/`connections` as dependencies. Those objects get a fresh
  // reference on every repo://status watcher event (and on each bootstrap
  // thunk landing); depending on them re-ran this effect — and thus fired
  // `tick()` (a full fetch of every repo's PRs) — on every such change,
  // storming the IPC layer and flooding the dev console.
  const reposRef = useRef(repos);
  reposRef.current = repos;
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  // Re-poll only when the *set* of connected repos actually changes (e.g. a
  // repo is added or a provider connects), not on every reference churn.
  const connectedKey = useMemo(
    () =>
      Object.values(repos)
        .filter((r) => r.providerId && connections[r.providerId]?.connected)
        .map((r) => r.id)
        .sort()
        .join(","),
    [repos, connections],
  );

  useEffect(() => {
    const tick = () => {
      for (const repo of Object.values(reposRef.current)) {
        if (!repo.providerId) continue;
        if (!connectionsRef.current[repo.providerId]?.connected) continue;
        void dispatch(fetchPullRequests(repo.id));
      }
    };
    tick();
    const handle = window.setInterval(tick, DEFAULT_POLL_MS);
    return () => window.clearInterval(handle);
  }, [dispatch, connectedKey]);
}
