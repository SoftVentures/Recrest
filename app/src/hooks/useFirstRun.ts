import { useEffect, useState } from "react";

import { useAppSelector } from "@/store/hooks";

const STORAGE_KEY = "recrest:onboarding-dismissed";

/**
 * First-run detection. True when no scan paths and no connected providers,
 * and the user hasn't explicitly dismissed the wizard before.
 */
export function useFirstRun(): {
  shouldShow: boolean;
  dismiss: () => void;
  reopen: () => void;
} {
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const providers = useAppSelector((s) => s.providers.connections);
  const settingsLoaded = useAppSelector((s) => !s.settings.loading);

  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true",
  );

  // Re-read localStorage once on mount in case another tab/window changed it.
  useEffect(() => {
    const current = localStorage.getItem(STORAGE_KEY) === "true";
    if (current !== dismissed) setDismissed(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noProviders = Object.values(providers).every((c) => !c?.connected);
  const noScanPaths = scanPaths.length === 0;

  const shouldShow = settingsLoaded && !dismissed && noScanPaths && noProviders;

  return {
    shouldShow,
    dismiss: () => {
      localStorage.setItem(STORAGE_KEY, "true");
      setDismissed(true);
    },
    reopen: () => {
      localStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
    },
  };
}
