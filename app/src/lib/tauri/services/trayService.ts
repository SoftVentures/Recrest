import { safeInvoke } from "@/lib/tauri";

export const trayService = {
  async updateBadge(unreadCount: number): Promise<void> {
    await safeInvoke("update_tray_badge", { unreadCount: Math.max(0, Math.floor(unreadCount)) });
  },
};
