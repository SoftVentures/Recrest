import { APP_VERSION } from "@recrest/shared";

import { BrandMark } from "@/components/organisms/brand/BrandMark";
import { runWindow } from "@/components/organisms/layout/Titlebar/runWindow";

interface Win11TitlebarProps {
  isMaximized: boolean;
}

/**
 * Windows-11-Chrome. Drei Mini-Buttons rechts (46×32), Close-Hover rot
 * (#c42b1c). Brand + Version links, keine Separator-Pipe.
 */
export function Win11Titlebar({ isMaximized }: Win11TitlebarProps) {
  return (
    <div className="chrome chrome-win11" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <span className="t-mark">
          <BrandMark size={14} stroke="#ffffff" strokeWidth={72} />
        </span>
        <span className="t-name">Recrest</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
      <div className="t-ctrls">
        <button
          className="t-btn"
          title="Minimize"
          type="button"
          onClick={() => void runWindow((w) => w.minimize())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
        <button
          className="t-btn"
          title={isMaximized ? "Restore" : "Maximize"}
          type="button"
          onClick={() => void runWindow((w) => w.toggleMaximize())}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="0.5"
                y="2.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
              <rect
                x="3.5"
                y="0.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
              />
            </svg>
          )}
        </button>
        <button
          className="t-btn close"
          title="Close"
          type="button"
          onClick={() => void runWindow((w) => w.close())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
