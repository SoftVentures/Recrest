import { APP_VERSION } from "@recrest/shared";

import { AppIcon } from "@/components/organisms/brand/AppIcon";

/**
 * macOS „Overlay"-Titlebar. Das System rendert die Traffic-Lights links
 * (konfiguriert via `trafficLightPosition` in `tauri.macos.conf.json`). Wir
 * füllen nur den Drag-Bereich rechts daneben mit Brand + Version.
 *
 * Der Container ist absichtlich transparent (`background: transparent`,
 * siehe `tokens.scss .chrome-mac`), damit die nativen Traffic-Lights —
 * auch im inaktiven Fensterzustand, in dem macOS sie zu grauen Punkten
 * ausblendet — sichtbar bleiben und nicht von unserer Canvas-Farbe
 * überdeckt werden.
 */
export function MacOverlayTitlebar() {
  return (
    <div className="chrome chrome-mac" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <AppIcon className="t-mark" />
        <span className="t-name">Recrest</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
