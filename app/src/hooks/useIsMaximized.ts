import { useCallback, useEffect, useState } from "react";

/**
 * Tracks the maximized state of the active Tauri window. The `enabled` flag lets
 * callers gate the listener on a platform-specific titlebar (only the Win11
 * chrome cares about this — macOS/Gnome don't render a maximize toggle).
 *
 * Returns `false` outside Tauri or while the window plugin import is pending.
 */
export function useIsMaximized(enabled: boolean): boolean {
  const [isMax, setIsMax] = useState(false);

  const sync = useCallback(async () => {
    if (!enabled) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      setIsMax(await getCurrentWindow().isMaximized());
    } catch {
      /* noop */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void sync();
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        unlisten = await getCurrentWindow().onResized(() => void sync());
      } catch {
        /* noop */
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [enabled, sync]);

  return isMax;
}
