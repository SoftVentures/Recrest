import { isTauri } from "@/lib/tauri";

export const autostartService = {
  async isEnabled(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      return isEnabled();
    } catch {
      return false;
    }
  },

  async enable(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { enable } = await import("@tauri-apps/plugin-autostart");
      await enable();
    } catch (err) {
      console.warn("[tauri] autostart enable failed:", err);
    }
  },

  async disable(): Promise<void> {
    if (!isTauri()) return;
    try {
      const { disable } = await import("@tauri-apps/plugin-autostart");
      await disable();
    } catch (err) {
      console.warn("[tauri] autostart disable failed:", err);
    }
  },

  async sync(desired: boolean): Promise<void> {
    const current = await this.isEnabled();
    if (current === desired) return;
    if (desired) await this.enable();
    else await this.disable();
  },
};
