import GnomeTitlebar from "@/components/organisms/titlebars/GnomeTitlebar";
import MacOverlayTitlebar from "@/components/organisms/titlebars/MacOverlayTitlebar";
import Win11Titlebar from "@/components/organisms/titlebars/Win11Titlebar";
import { useIsMaximized } from "@/hooks/useIsMaximized";
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

export default Titlebar;
