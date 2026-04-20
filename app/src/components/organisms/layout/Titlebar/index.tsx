import { useCallback, useEffect, useState } from "react";

import { GnomeTitlebar } from "@/components/organisms/layout/Titlebar/GnomeTitlebar";
import { MacOverlayTitlebar } from "@/components/organisms/layout/Titlebar/MacOverlayTitlebar";
import { Win11Titlebar } from "@/components/organisms/layout/Titlebar/Win11Titlebar";
import { useWindowChrome } from "@/hooks/usePlatform";

/**
 * Dispatcher-Komponente für OS-spezifische Fenster-Chromes. In reinem
 * Web-Mode (Browser, kein Tauri) rendert sie nichts — die Browser-Leiste
 * übernimmt. Unter Tauri wählt sie eine der drei Chrome-Varianten.
 *
 * Traffic Lights auf macOS kommen vom System (konfiguriert über
 * `titleBarStyle: "Overlay"` in `tauri.macos.conf.json`), deshalb hat
 * `MacOverlayTitlebar` keine eigenen Window-Buttons.
 */
export function Titlebar() {
  const chrome = useWindowChrome();
  const isMaximized = useIsMaximized(chrome === "win11");

  if (chrome === "none") return null;
  if (chrome === "macos-overlay") return <MacOverlayTitlebar />;
  if (chrome === "gnome") return <GnomeTitlebar />;
  return <Win11Titlebar isMaximized={isMaximized} />;
}

/**
 * Liest den Maximiert-Zustand nur auf Windows, da nur das Win11-Chrome den
 * Restore/Maximize-Switch visualisiert.
 */
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
