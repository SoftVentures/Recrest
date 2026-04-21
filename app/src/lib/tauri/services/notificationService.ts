import { type NotifyPayload, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";

export interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
}

export const notificationService = {
  async isPermissionGranted(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
      return isPermissionGranted();
    } catch {
      return false;
    }
  },

  async requestPermission(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { requestPermission } = await import("@tauri-apps/plugin-notification");
      const result = await requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  },

  /** Request permission if not already granted; returns the final grant state. */
  async ensurePermission(): Promise<boolean> {
    if (await this.isPermissionGranted()) return true;
    return this.requestPermission();
  },

  /**
   * Thin wrapper around the Rust-side `notify` command. The Rust side gates
   * on the user's per-kind settings toggles and is the single source of
   * truth for whether a notification actually fires — the frontend should
   * emit liberally and let the backend filter.
   */
  async notifyViaBackend(payload: NotifyPayload): Promise<void> {
    if (!isTauri()) return;
    try {
      await invoke<void>(TauriCommand.NOTIFY, {
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
      });
    } catch (err) {
      console.warn("[tauri] notify invoke failed:", err);
    }
  },
};
