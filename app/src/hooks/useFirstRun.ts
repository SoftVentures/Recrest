import { useEffect, useState } from "react";

import { StorageKey } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

const STORAGE_KEY = StorageKey.ONBOARDING_DISMISSED;
/**
 * Session-scoped flag that bypasses the first-run heuristics (no scanPaths,
 * no providers connected) when the developer explicitly re-triggers the
 * wizard from Settings. Lives in `sessionStorage` so it dies with the tab
 * and never leaks into normal launches.
 */
const FORCE_KEY = `${STORAGE_KEY}-force`;

/**
 * First-run detection. Returns `shouldShow=true` when the user has no
 * configured scan paths and no connected provider, *and* hasn't explicitly
 * dismissed the wizard before. Once dismissed the flag is persisted to
 * `localStorage` so the next launch goes straight to the dashboard.
 *
 * Re-opens the wizard via `reopen()` — wired into the developer "Retrigger
 * onboarding" affordance. `reopen()` also raises the session-scoped force
 * flag so the wizard shows even when scanPaths / provider connections are
 * already populated (which would otherwise gate it shut).
 */
export function useFirstRun(): {
  shouldShow: boolean;
  dismiss: () => void;
  reopen: () => void;
} {
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);
  const providers = useAppSelector((s) => s.providers.connections);
  const settingsLoaded = useAppSelector((s) => !s.settings.loading);

  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true",
  );
  const [forced, setForced] = useState<boolean>(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem(FORCE_KEY) === "true",
  );

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const currentDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (currentDismissed !== dismissed) setDismissed(currentDismissed);
    if (typeof sessionStorage !== "undefined") {
      const currentForced = sessionStorage.getItem(FORCE_KEY) === "true";
      if (currentForced !== forced) setForced(currentForced);
    }
    // Run once on mount — re-syncing on every render would race against the
    // dismiss() write below and could flip the flag back on within the same
    // tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noProviders = Object.values(providers).every((c) => !c?.connected);
  const noScanPaths = scanPaths.length === 0;

  const shouldShow = settingsLoaded && (forced || (!dismissed && noScanPaths && noProviders));

  return {
    shouldShow,
    dismiss: () => {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, "true");
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(FORCE_KEY);
      setDismissed(true);
      setForced(false);
    },
    reopen: () => {
      if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(FORCE_KEY, "true");
      setDismissed(false);
      setForced(true);
    },
  };
}
