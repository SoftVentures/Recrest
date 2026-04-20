import { APP_VERSION } from "@recrest/shared";

import { BrandMark } from "@/components/organisms/brand/BrandMark";
import { runWindow } from "@/components/organisms/layout/Titlebar/runWindow";

/**
 * libadwaita-angelehnte GNOME-Titlebar: Brand + Version links, ein
 * runder Close-Button rechts. Minimize/Maximize fallen bewusst weg —
 * GNOME-Konvention erwartet das über Doppelklick auf die Drag-Region
 * bzw. Tastenkürzel.
 */
export function GnomeTitlebar() {
  return (
    <div className="chrome chrome-gnome" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <span className="t-mark">
          <BrandMark size={14} stroke="#ffffff" strokeWidth={72} />
        </span>
        <span className="t-name">Recrest</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
      <button
        className="t-close-pill"
        title="Close"
        type="button"
        onClick={() => void runWindow((w) => w.close())}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
    </div>
  );
}
