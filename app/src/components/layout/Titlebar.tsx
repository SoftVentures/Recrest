import { useCallback, useEffect, useState } from "react";

import { Minus, Square, SquareStack, X } from "lucide-react";

import { APP_NAME, TITLEBAR_HEIGHT_PX } from "@recrest/shared";

import { Logo } from "@/components/brand/Logo";
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

  if (!isTauri()) return null;

  const runWindow = async (fn: (w: Awaited<ReturnType<typeof getCurrentWindow>>) => Promise<unknown>) => {
    try {
      const w = await getCurrentWindow();
      await fn(w);
    } catch (err) {
      console.warn("[titlebar]", err);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex shrink-0 select-none items-center justify-between border-b border-border bg-card"
      style={{ height: TITLEBAR_HEIGHT_PX }}
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 items-center gap-2 px-3 text-xs font-semibold"
      >
        <Logo className="h-4 w-4 shrink-0" />
        <span className="text-foreground">{APP_NAME}</span>
      </div>

      <div className="flex h-full items-center">
        <TitlebarButton
          onClick={() => void runWindow((w) => w.minimize())}
          aria-label="Minimize"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </TitlebarButton>
        <TitlebarButton
          onClick={() => void runWindow((w) => w.toggleMaximize())}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <SquareStack className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Square className="h-3.5 w-3.5" aria-hidden />
          )}
        </TitlebarButton>
        <TitlebarButton
          onClick={() => void runWindow((w) => w.close())}
          aria-label="Close"
          variant="close"
        >
          <X className="h-4 w-4" aria-hidden />
        </TitlebarButton>
      </div>
    </div>
  );
}

interface TitlebarButtonProps {
  onClick: () => void;
  "aria-label": string;
  variant?: "default" | "close";
  children: React.ReactNode;
}

function TitlebarButton({ onClick, "aria-label": label, variant = "default", children }: TitlebarButtonProps) {
  const base = "flex h-full w-11 items-center justify-center text-foreground transition-colors";
  const hover =
    variant === "close"
      ? "hover:bg-red-500 hover:text-white"
      : "hover:bg-accent hover:text-accent-foreground";
  return (
    <button type="button" className={`${base} ${hover}`} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

async function getCurrentWindow() {
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}
