import { isTauri } from "@/lib/tauri";

/**
 * Thin wrapper around `@tauri-apps/plugin-autostart`.
 *
 * Plan 1 §C.3: errors must be visible — both `enable()` and `disable()`
 * **throw** instead of `console.warn`-and-swallow, so the calling Settings
 * UI can surface a toast. Silent failures masked the Windows registry-key
 * issue for too long.
 *
 * Outside the Tauri runtime (`yarn dev:web`, vitest under jsdom) the methods
 * resolve as no-ops so dev/test code paths don't have to special-case it.
 */
export const autostartService = {
  async isEnabled(): Promise<boolean> {
    // The plugin call is the source of truth — see `sync()` below for why
    // we never trust the `settings.json` mirror.
    if (!isTauri()) return false;
    try {
      const { isEnabled } = await import("@tauri-apps/plugin-autostart");
      return isEnabled();
    } catch {
      // Reading state is best-effort; if the plugin isn't available we
      // treat that as "off" rather than blowing up the Settings tab.
      return false;
    }
  },

  async enable(): Promise<void> {
    if (!isTauri()) return;
    const { enable } = await import("@tauri-apps/plugin-autostart");
    await enable();
  },

  async disable(): Promise<void> {
    if (!isTauri()) return;
    const { disable } = await import("@tauri-apps/plugin-autostart");
    await disable();
  },

  /**
   * Reconcile the OS-level autostart entry with the desired state.
   *
   * Reads `is_enabled()` (the plugin call — *not* the Redux/`settings.json`
   * mirror) so a manual change in the Windows Task-Manager → Autostart tab
   * doesn't put us out of sync.
   */
  async sync(desired: boolean): Promise<void> {
    const current = await this.isEnabled();
    if (current === desired) return;
    if (desired) await this.enable();
    else await this.disable();
  },
};
