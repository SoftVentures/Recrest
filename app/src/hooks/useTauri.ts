import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  WINDOW_STATE_DEBOUNCE_MS,
  type WindowState,
} from "@recrest/shared";

import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useLastSeenVersion } from "@/hooks/useLastSeenVersion";
import { isTauri } from "@/lib/tauri";
import {
  autostartService,
  notificationService,
  trayService,
  windowService,
} from "@/lib/tauri/services";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadDetectedIdes } from "@/store/slices/settingsSlice";

/**
 * Orchestrates all Tauri desktop integrations. Mount once, high in the tree
 * (inside AppShell). In a plain browser dev session this hook is a no-op.
 */
export function useTauri(): void {
  const tauri = isTauri();

  useWindowStateSync(tauri);
  useMinWindowSize(tauri);
  useStartMinimized(tauri);
  useTrayBadgeSync(tauri);
  useNotificationPermission(tauri);
  useAutostartSync(tauri);
  // Auto-update scheduling is owned by the Rust side (`src-tauri/src/lib.rs`),
  // which survives tray-hide and minimized states. The previous JS scheduler
  // was removed to avoid duplicate probes.
  // TODO: runtime changes to `settings.autoUpdate` only take effect after
  // restart — the Rust scheduler reads the mode once at startup.
  useDeepLinks(tauri);
  useIdeDetection(tauri);
  useLastSeenVersion();
}

// ------------------------------------------------------------------ ide detect

let idesDetected = false;

function useIdeDetection(enabled: boolean): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!enabled || idesDetected) return;
    idesDetected = true;
    void dispatch(loadDetectedIdes());
  }, [enabled, dispatch]);
}

// ---------------------------------------------------------------- window state

// Module-level to survive component remounts during route changes.
let windowStateRestored = false;

function useWindowStateSync(enabled: boolean): void {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || windowStateRestored) return;
    windowStateRestored = true;

    void (async () => {
      const saved = await windowService.loadState();
      if (!saved) return;
      const validated = await windowService.validatePosition(saved);
      if (!validated) return;
      await windowService.applyState(validated);
    })();
  }, [enabled]);

  const saveState = useCallback(async () => {
    if (!enabled) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      // Never persist while minimized — sizes are 0 on some platforms and
      // would trap the next launch in a tiny window.
      if (await win.isMinimized()) return;
      const scale = await win.scaleFactor();
      const size = await win.outerSize();
      const pos = await win.outerPosition();
      const isMaximized = await win.isMaximized();
      const logicalWidth = size.width / scale;
      const logicalHeight = size.height / scale;
      if (logicalWidth < MIN_WINDOW_WIDTH || logicalHeight < MIN_WINDOW_HEIGHT) return;
      const state: WindowState = {
        width: logicalWidth,
        height: logicalHeight,
        x: pos.x / scale,
        y: pos.y / scale,
        isMaximized,
      };
      await windowService.saveState(state);
    } catch (err) {
      console.warn("[tauri] saveState failed:", err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let unlistenResize: (() => void) | null = null;
    let unlistenMove: (() => void) | null = null;

    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const debouncedSave = () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => void saveState(), WINDOW_STATE_DEBOUNCE_MS);
        };
        unlistenResize = await win.onResized(debouncedSave);
        unlistenMove = await win.onMoved(debouncedSave);
      } catch (err) {
        console.warn("[tauri] window listener setup failed:", err);
      }
    })();

    return () => {
      unlistenResize?.();
      unlistenMove?.();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, saveState]);
}

function useMinWindowSize(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void windowService.setMinSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
  }, [enabled]);
}

function useStartMinimized(enabled: boolean): void {
  const startMinimized = useAppSelector((s) => s.settings.startMinimized);
  const minimizedOnce = useRef(false);

  useEffect(() => {
    if (!enabled || !startMinimized || minimizedOnce.current) return;
    minimizedOnce.current = true;
    void windowService.minimize();
  }, [enabled, startMinimized]);
}

// ----------------------------------------------------------------- tray badge

function useTrayBadgeSync(enabled: boolean): void {
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const openPrCount = useMemo(() => {
    let count = 0;
    for (const prs of Object.values(prsByRepo)) {
      if (!prs) continue;
      for (const pr of prs) {
        if (pr.state === "open" && !pr.draft) count += 1;
      }
    }
    return count;
  }, [prsByRepo]);

  useEffect(() => {
    if (!enabled) return;
    void trayService.updateBadge(openPrCount);
  }, [enabled, openPrCount]);
}

// -------------------------------------------------------- notification permission

let notificationPermissionRequested = false;

function useNotificationPermission(enabled: boolean): void {
  const wantNotifications = useAppSelector((s) => s.settings.notifications.enabled);

  useEffect(() => {
    if (!enabled || !wantNotifications || notificationPermissionRequested) return;
    notificationPermissionRequested = true;
    void notificationService.ensurePermission();
  }, [enabled, wantNotifications]);
}

// ------------------------------------------------------------------- autostart

function useAutostartSync(enabled: boolean): void {
  const autoStart = useAppSelector((s) => s.settings.autoStart);

  useEffect(() => {
    if (!enabled) return;
    void autostartService.sync(autoStart);
  }, [enabled, autoStart]);
}
