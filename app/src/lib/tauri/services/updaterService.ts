import { isTauri } from "@/lib/tauri";

/**
 * Minimal surface that the renderer still needs. The full
 * check/download/install pipeline lives in Rust (`commands/update.rs`) —
 * the frontend only invokes `TauriCommand.CHECK_FOR_UPDATE` and
 * `TauriCommand.INSTALL_UPDATE` and listens for `updater://available` +
 * `updater://progress` events.
 */
export const updaterService = {
  async getCurrentVersion(): Promise<string | null> {
    if (!isTauri()) return null;
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      return getVersion();
    } catch {
      return null;
    }
  },
};
