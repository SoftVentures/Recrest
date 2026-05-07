import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { APP_VERSION } from "@recrest/shared";

import { BrandMark } from "@/components/organisms/brand/BrandMark";
import { runWindow } from "@/components/organisms/layout/Titlebar/runWindow";
import { invoke, isTauri } from "@/lib/tauri";

interface Win11TitlebarProps {
  isMaximized: boolean;
}

/**
 * Windows-11-Chrome. Drei Mini-Buttons rechts (46×32), Close-Hover rot
 * (#c42b1c). Brand + Version links, keine Separator-Pipe.
 *
 * The buttons intentionally rely on `aria-label` + native browser tooltips
 * (no custom Radix tooltip) so they don't double up with the OS-level
 * tooltips Windows shows when our Win32 subclass returns `HTMINBUTTON` /
 * `HTMAXBUTTON` / `HTCLOSE` from `WM_NCHITTEST`. The same `HTMAXBUTTON`
 * answer is what makes Windows 11 surface its Snap-Layouts flyout when
 * the user hovers the maximize button — the Rust subclass needs to know
 * the pixel rect of each button, so we measure them with
 * `getBoundingClientRect()` and push the values via the
 * `set_caption_button_bounds` IPC command after mount and on every
 * `ResizeObserver` tick.
 */
export function Win11Titlebar({ isMaximized }: Win11TitlebarProps) {
  const { t } = useTranslation("common");
  const minimizeLabel = t("titlebar.minimize");
  const maximizeLabel = isMaximized ? t("titlebar.restore") : t("titlebar.maximize");
  const closeLabel = t("titlebar.close");

  const minRef = useRef<HTMLButtonElement | null>(null);
  const maxRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const min = minRef.current;
    const max = maxRef.current;
    const close = closeRef.current;
    if (!min || !max || !close) return;

    const rectOf = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };

    const push = () => {
      void invoke("set_caption_button_bounds", {
        min: rectOf(min),
        max: rectOf(max),
        close: rectOf(close),
      }).catch(() => {
        // No-op outside the Tauri runtime / non-Windows builds where the
        // command exists but performs no work. Errors here aren't fatal —
        // the worst case is missing Snap-Layouts hover, not a broken UI.
      });
    };

    push();
    const observer = new ResizeObserver(push);
    observer.observe(min);
    observer.observe(max);
    observer.observe(close);
    window.addEventListener("resize", push);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", push);
    };
  }, []);

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
          ref={minRef}
          className="t-btn"
          type="button"
          aria-label={minimizeLabel}
          title={minimizeLabel}
          data-testid="titlebar-min"
          onClick={() => void runWindow((w) => w.minimize())}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
        <button
          ref={maxRef}
          className="t-btn"
          type="button"
          aria-label={maximizeLabel}
          title={maximizeLabel}
          data-testid="titlebar-max"
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
          ref={closeRef}
          className="t-btn close"
          type="button"
          aria-label={closeLabel}
          title={closeLabel}
          data-testid="titlebar-close"
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
