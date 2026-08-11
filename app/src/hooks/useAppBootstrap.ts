import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { type SettingsCorruption, TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import { invoke, isTauri } from "@/lib/tauri";
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
  const { t } = useTranslation();

  // Held in a ref so a language switch can't re-run the whole bootstrap —
  // this effect must fire exactly once per mount.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (!isTauri()) return;
    // A settings.json that failed to parse is quarantined rather than
    // overwritten, but the boot detection happens before this renderer exists —
    // so it has to be pulled, not awaited as an event. Fired detached: the
    // condition is almost never true, and awaiting it ahead of the real
    // bootstrap put a serial IPC round-trip in front of every cold start.
    void (async () => {
      const corruption = await invoke<SettingsCorruption | null>(
        TauriCommand.GET_SETTINGS_CORRUPTION,
      ).catch(() => null);
      if (!corruption) return;
      toast.error(tRef.current("settings_corrupt.title"), {
        description: corruption.quarantinePath
          ? tRef.current("settings_corrupt.quarantined", { path: corruption.quarantinePath })
          : tRef.current("settings_corrupt.not_quarantined"),
        duration: Infinity,
        closeButton: true,
      });
    })();

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
