import { EventChannel, STORAGE_PREFIX } from "@recrest/shared";

import { safeListen } from "@/lib/tauri";

/**
 * Wipe every `recrest:*` key from `localStorage` and `sessionStorage`. Used
 * by the Developer-tab factory-reset button after the backend IPC and by
 * the global `settings://reset` listener (Rust `factory_reset` emits the
 * event after clearing on-disk state, so any other window/instance also
 * sees the wipe). Idempotent — running twice is harmless.
 *
 * Storage access is wrapped in try/catch because private-mode browsers
 * throw when accessing `localStorage` / `sessionStorage`, and we still
 * want the rest of the reset flow to run.
 */
export function clearRecrestStorage(): void {
  try {
    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) localKeys.push(k);
    }
    localKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage may be unavailable in private mode */
  }

  try {
    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) sessionKeys.push(k);
    }
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* sessionStorage may be unavailable in private mode */
  }
}

/**
 * Subscribes to the backend `settings://reset` channel emitted by the Rust
 * `factory_reset` command. On receipt we wipe namespaced storage and reload
 * the window so every Redux slice rehydrates from defaults — same behaviour
 * the Developer-tab button drives, just triggered by the backend instead of
 * a user-initiated dialog confirm. Returns the unsubscribe handle so callers
 * can detach during teardown (only the bootstrap call uses this).
 */
export async function registerSettingsResetListener(): Promise<() => void> {
  return safeListen(EventChannel.SETTINGS_RESET, () => {
    clearRecrestStorage();
    // Tiny delay so the toast/UI can paint a final frame before reload.
    setTimeout(() => window.location.reload(), 250);
  });
}
