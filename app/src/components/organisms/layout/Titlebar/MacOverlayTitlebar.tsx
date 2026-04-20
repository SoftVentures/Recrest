import { APP_VERSION } from "@recrest/shared";

import { BrandMark } from "@/components/organisms/brand/BrandMark";

/**
 * macOS „Overlay"-Titlebar. Das System rendert die Traffic-Lights links
 * (konfiguriert via `trafficLightPosition` in `tauri.macos.conf.json`). Wir
 * füllen nur den Drag-Bereich rechts daneben mit Brand + Version.
 */
export function MacOverlayTitlebar() {
  return (
    <div className="chrome chrome-mac" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <span className="t-mark">
          <BrandMark size={14} stroke="#ffffff" strokeWidth={72} />
        </span>
        <span className="t-name">Recrest</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
