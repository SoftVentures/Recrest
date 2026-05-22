import { useEffect } from "react";

import { isTauri } from "@/lib/tauri";
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
 */
export function useAppBootstrap(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isTauri()) return;
    void dispatch(loadSettings());
    void dispatch(loadRepos());
    void dispatch(loadProviders());
  }, [dispatch]);
}
