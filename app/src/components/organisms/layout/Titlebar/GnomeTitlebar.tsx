import { useTranslation } from "react-i18next";

import { APP_VERSION } from "@recrest/shared";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { BrandMark } from "@/components/organisms/brand/BrandMark";
import { runWindow } from "@/components/organisms/layout/Titlebar/runWindow";

/**
 * libadwaita-angelehnte GNOME-Titlebar: Brand + Version links, ein
 * runder Close-Button rechts. Minimize/Maximize fallen bewusst weg —
 * GNOME-Konvention erwartet das über Doppelklick auf die Drag-Region
 * bzw. Tastenkürzel.
 */
export function GnomeTitlebar() {
  const { t } = useTranslation("common");
  const closeLabel = t("titlebar.close");
  return (
    <div className="chrome chrome-gnome" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <span className="t-mark">
          <BrandMark size={14} stroke="#ffffff" strokeWidth={72} />
        </span>
        <span className="t-name">Recrest</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="t-close-pill"
            type="button"
            aria-label={closeLabel}
            data-testid="titlebar-close"
            onClick={() => void runWindow((w) => w.close())}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent>{closeLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}
