import type { WindowState } from "@recrest/shared";

import { isTauri, safeInvoke } from "@/lib/tauri";

export const windowService = {
  async loadState(): Promise<WindowState | null> {
    return safeInvoke<WindowState | null>("load_window_state").then((v) => v ?? null);
  },

  async saveState(state: WindowState): Promise<void> {
    await safeInvoke("save_window_state", { state });
  },

  async validatePosition(state: WindowState): Promise<WindowState | null> {
    return safeInvoke<WindowState>("validate_window_position", { state });
  },

  async applyState(state: WindowState): Promise<void> {
    if (!isTauri()) return;
    const win = await getCurrentWindow();
    if (!win) return;
    try {
      const { LogicalSize, LogicalPosition } = await import("@tauri-apps/api/window");
      await win.setSize(new LogicalSize(state.width, state.height));
      await win.setPosition(new LogicalPosition(state.x, state.y));
      if (state.isMaximized) {
        await win.maximize();
      }
    } catch (err) {
      console.warn("[tauri] applyState failed:", err);
    }
  },

  async setMinSize(width: number, height: number): Promise<void> {
    if (!isTauri()) return;
    const win = await getCurrentWindow();
    if (!win) return;
    try {
      const { LogicalSize } = await import("@tauri-apps/api/window");
      await win.setMinSize(new LogicalSize(width, height));
    } catch (err) {
      console.warn("[tauri] setMinSize failed:", err);
    }
  },

  async minimize(): Promise<void> {
    if (!isTauri()) return;
    const win = await getCurrentWindow();
    if (!win) return;
    try {
      await win.minimize();
    } catch {
      /* noop */
    }
  },

  async getCurrent() {
    return getCurrentWindow();
  },
};

async function getCurrentWindow() {
  if (!isTauri()) return null;
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}
