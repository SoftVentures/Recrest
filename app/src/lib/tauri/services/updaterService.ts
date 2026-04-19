import { isTauri } from "@/lib/tauri";

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

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

  async checkForUpdate(): Promise<UpdateInfo | null> {
    if (!isTauri()) return null;
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) return null;
      return { version: update.version, date: update.date, body: update.body };
    } catch (err) {
      console.warn("[tauri] checkForUpdate failed:", err);
      return null;
    }
  },

  async downloadAndInstall(
    onProgress?: (received: number, total?: number) => void,
  ): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) return false;
      let received = 0;
      let total: number | undefined;
      await update.downloadAndInstall((evt) => {
        if (evt.event === "Started") {
          total = evt.data.contentLength ?? undefined;
        } else if (evt.event === "Progress") {
          received += evt.data.chunkLength;
          onProgress?.(received, total);
        }
      });
      return true;
    } catch (err) {
      console.warn("[tauri] downloadAndInstall failed:", err);
      return false;
    }
  },

  async relaunch(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.warn("[tauri] relaunch failed:", err);
    }
  },
};
