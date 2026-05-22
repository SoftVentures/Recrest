import { useCallback, useEffect, useState } from "react";

import GnomeTitlebar from "@/components/organisms/titlebars/GnomeTitlebar";
import MacOverlayTitlebar from "@/components/organisms/titlebars/MacOverlayTitlebar";
import Win11Titlebar from "@/components/organisms/titlebars/Win11Titlebar";
import { useWindowChrome } from "@/hooks/usePlatform";

/**
 * Dispatcher for the OS-specific window chrome. In pure-web mode (browser, no
 * Tauri) renders nothing — the browser provides the window frame. Inside Tauri
 * it picks one of the three chrome variants.
 */
function Titlebar() {
  const chrome = useWindowChrome();
  const isMaximized = useIsMaximized(chrome === "win11");

  if (chrome === "none") return null;
  if (chrome === "macos-overlay") return <MacOverlayTitlebar />;
  if (chrome === "gnome") return <GnomeTitlebar />;
  return <Win11Titlebar isMaximized={isMaximized} />;
}

function useIsMaximized(enabled: boolean): boolean {
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

export default Titlebar;
