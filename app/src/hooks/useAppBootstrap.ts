import { useEffect } from "react";

import { isTauri } from "@/lib/tauri";
import { scanForRepos } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { loadProviders } from "@/store/reducers/providersReducer";
import { loadRepos } from "@/store/reducers/reposReducer";
import { loadSettings } from "@/store/reducers/settingsReducer";

/**
 * Initial data fetch after Redux is wired. Settings + repos + provider
 * connections are the only data the Sidebar needs to render counts; per-page
 * hooks then fetch domain-specific data on mount.
 *
 * Outside Tauri (`yarn dev:web`, Playwright with stub) `invoke` is routed to
 * the dev stub, so this still resolves with seed data.
 *
 * If the user has scan paths persisted but `list_repos` returns nothing
 * (fresh install with paths configured via Settings → Integrations, or a
 * settings.json that lost its `repos` map), kick off a discovery scan so
 * the dashboard isn't permanently empty.
 *
 * This is only the boot bootstrap. The filesystem watcher does NOT surface
 * repos that appear later — it subscribes to already-registered repos and
 * never observes the scan roots themselves — so discovery of new repos on a
 * populated install is owned by `useRepoAutoRescan`.
 */
export function useAppBootstrap(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isTauri()) return;
    void (async () => {
      const [settings, repos] = await Promise.all([
        dispatch(loadSettings())
          .unwrap()
          .catch(() => null),
        dispatch(loadRepos())
          .unwrap()
          .catch(() => [] as unknown[]),
      ]);
      void dispatch(loadProviders());
      const paths = settings?.scanPaths ?? [];
      if (paths.length > 0 && repos.length === 0) {
        void dispatch(scanForRepos(paths));
      }
    })();
  }, [dispatch]);
}
