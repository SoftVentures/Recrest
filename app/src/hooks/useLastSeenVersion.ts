import { useEffect } from "react";

import { StorageKey } from "@recrest/shared";

import { updaterService } from "@/lib/tauri/services";

/**
 * Records the current app version to `localStorage` under
 * {@link StorageKey.LAST_SEEN_VERSION} on mount. Phase 1 of the
 * "What's new" / release-notes pipeline — the read side simply stamps the
 * current version; the diff/dialog-firing surface will be added separately.
 *
 * Paired with the developer-tab "Reset 'last seen version'" affordance so
 * that button becomes a real signal instead of a ghost: clear the key, the
 * hook re-populates on next mount.
 *
 * No-ops outside Tauri (`getCurrentVersion` returns null) so the plain
 * browser dev session doesn't accidentally pin a "web" sentinel value.
 */
export function useLastSeenVersion(): void {
  useEffect(() => {
    void (async () => {
      try {
        const version = await updaterService.getCurrentVersion();
        if (!version) return;
        const seen = localStorage.getItem(StorageKey.LAST_SEEN_VERSION);
        if (seen === version) return;
        localStorage.setItem(StorageKey.LAST_SEEN_VERSION, version);
      } catch {
        /* localStorage unavailable — non-fatal */
      }
    })();
  }, []);
}
