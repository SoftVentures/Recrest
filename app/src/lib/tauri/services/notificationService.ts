import { isTauri } from "@/lib/tauri";

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

  async send(payload: NotificationPayload): Promise<void> {
    if (!isTauri()) return;
    try {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification(payload);
    } catch (err) {
      console.warn("[tauri] sendNotification failed:", err);
    }
  },

  /** Request permission if not already granted; returns the final grant state. */
  async ensurePermission(): Promise<boolean> {
    if (await this.isPermissionGranted()) return true;
    return this.requestPermission();
  },
};
