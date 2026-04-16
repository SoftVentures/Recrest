import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadProviders } from "@/store/slices/providersSlice";
import { fetchPullRequests } from "@/store/slices/prsSlice";
import { loadRepos } from "@/store/slices/reposSlice";

/** Loads provider connections on mount and polls pull requests on the configured cadence. */
export function usePrPolling(): void {
  const dispatch = useAppDispatch();
  const repos = useAppSelector((s) => s.repos.items);
  const pollingInterval = useAppSelector((s) => s.settings.pollingIntervalMs);
  const connections = useAppSelector((s) => s.providers.connections);

  useEffect(() => {
    void dispatch(loadProviders());
    void dispatch(loadRepos());
  }, [dispatch]);

  useEffect(() => {
    const tick = () => {
      for (const repo of Object.values(repos)) {
        if (!repo.providerId) continue;
        if (!connections[repo.providerId]?.connected) continue;
        void dispatch(fetchPullRequests(repo.id));
      }
    };
    tick();
    const handle = window.setInterval(tick, Math.max(pollingInterval, 30_000));
    return () => window.clearInterval(handle);
  }, [dispatch, repos, pollingInterval, connections]);
}
