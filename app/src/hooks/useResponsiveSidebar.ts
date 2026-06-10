import { useEffect, useRef, useSyncExternalStore } from "react";

import { useDevice } from "@/hooks/useDevice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSidebarCollapsed } from "@/store/reducers/uiReducer";

/** Viewport below this collapses the sidebar even on "laptop"-class
 *  devices — the macOS min window (1100×720) sits here, and an expanded
 *  sidebar at that width starves the main pane (RepoDetail header wraps
 *  awkwardly, action cluster drops to its own row, etc.). */
const COMPACT_LAYOUT_BREAKPOINT_PX = 1200;

function subscribeToCompactLayout(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const mql = window.matchMedia(`(max-width: ${COMPACT_LAYOUT_BREAKPOINT_PX - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getCompactLayoutSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(`(max-width: ${COMPACT_LAYOUT_BREAKPOINT_PX - 1}px)`).matches;
}

function getCompactLayoutServerSnapshot(): boolean {
  return false;
}

/**
 * Auto-collapses the sidebar on narrow viewports (mobile/tablet/compact-laptop)
 * while remembering the user's manual preference. On wider viewports the hook
 * restores the persisted state instead of staying collapsed.
 */
export function useResponsiveSidebar(): void {
  const device = useDevice();
  const compact = useSyncExternalStore(
    subscribeToCompactLayout,
    getCompactLayoutSnapshot,
    getCompactLayoutServerSnapshot,
  );
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const userPrefRef = useRef(collapsed);
  const forcedRef = useRef(false);

  useEffect(() => {
    const narrow = device.isMobile || device.isTablet || compact;
    if (narrow && !collapsed) {
      userPrefRef.current = collapsed;
      forcedRef.current = true;
      dispatch(setSidebarCollapsed(true));
    } else if (!narrow && forcedRef.current) {
      forcedRef.current = false;
      dispatch(setSidebarCollapsed(userPrefRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.isMobile, device.isTablet, compact, dispatch]);
}
