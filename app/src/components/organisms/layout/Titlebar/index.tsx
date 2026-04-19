import { useCallback, useEffect, useState } from "react";

import { APP_VERSION } from "@recrest/shared";

import { BrandMark } from "@/components/organisms/brand/BrandMark";
import { isTauri } from "@/lib/tauri";

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const syncMaximized = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      setIsMaximized(await getCurrentWindow().isMaximized());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    void syncMaximized();
    let unlisten: (() => void) | null = null;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        unlisten = await getCurrentWindow().onResized(() => void syncMaximized());
      } catch {
        /* noop */
      }
    })();

    return () => {
      unlisten?.();
    };
  }, [syncMaximized]);

  if (!isTauri()) {
    // In the pure-web dev mode we still want the design's titlebar chrome
    // so the layout matches; window controls become no-ops.
    return <ChromeTitlebar isMaximized={false} onMinimize={noop} onMax={noop} onClose={noop} />;
  }

  const runWindow = async (
    fn: (w: Awaited<ReturnType<typeof getCurrentWindow>>) => Promise<unknown>,
  ) => {
    try {
      const w = await getCurrentWindow();
      await fn(w);
    } catch (err) {
      console.warn("[titlebar]", err);
    }
  };

  return (
    <ChromeTitlebar
      isMaximized={isMaximized}
      onMinimize={() => void runWindow((w) => w.minimize())}
      onMax={() => void runWindow((w) => w.toggleMaximize())}
      onClose={() => void runWindow((w) => w.close())}
    />
  );
}

function noop() {
  /* no-op */
}

interface ChromeTitlebarProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMax: () => void;
  onClose: () => void;
}

function ChromeTitlebar({ isMaximized, onMinimize, onMax, onClose }: ChromeTitlebarProps) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="t-title" data-tauri-drag-region>
        <span className="t-mark">
          <BrandMark size={14} stroke="#ffffff" strokeWidth={72} />
        </span>
        <span className="t-name">Recrest</span>
        <span className="t-sep">|</span>
        <span className="t-version">v{APP_VERSION}</span>
      </div>
      <div className="t-ctrls">
        <button className="t-btn" title="Minimize" type="button" onClick={onMinimize}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          className="t-btn"
          title={isMaximized ? "Restore" : "Maximize"}
          type="button"
          onClick={onMax}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect
                x="0.5"
                y="2.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
              />
              <rect
                x="3.5"
                y="0.5"
                width="6"
                height="6"
                stroke="currentColor"
                strokeWidth="1.2"
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
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          )}
        </button>
        <button className="t-btn close" title="Close" type="button" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

async function getCurrentWindow() {
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}
