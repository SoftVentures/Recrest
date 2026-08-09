import { useEffect, useRef, useSyncExternalStore } from "react";

import { useDevice } from "@/hooks/useDevice";
import { setSidebarCollapsedAuto } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
 * Auto-collapses the sidebar on narrow viewports while remembering the user's
 * manual preference, and restores that preference once the window is wide
 * again.
 *
 * The automatic collapse is dispatched as `setSidebarCollapsedAuto`, which
 * `settingsBackendSync` deliberately does **not** persist. Persisting it made
 * one narrow session overwrite the stored preference for good: the next cold
 * start hydrated `sidebarCollapsed: true`, the `narrow && !collapsed` branch
 * below then never fired, `forcedRef` stayed `false`, and widening the window
 * had nothing to restore. Only a collapse the user performed themselves
 * (`toggleSidebar` / `setSidebarCollapsed` from the sidebar chrome) is written
 * back to settings.
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
  const narrow = device.isMobile || device.isTablet || compact;

  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  /** The user's own preference — the value we restore on widening. */
  const userPrefRef = useRef(collapsed);
  /** The value this hook last forced, so the echo back through the store
   *  isn't mistaken for the user reaching for the toggle. */
  const pendingAutoRef = useRef<boolean | null>(null);
  const forcedRef = useRef(false);

  // Any change to `sidebarCollapsed` we did not cause ourselves is the user
  // clicking the toggle (or settings hydration replaying an earlier click) —
  // that is the value worth remembering.
  useEffect(() => {
    if (pendingAutoRef.current === collapsed) {
      pendingAutoRef.current = null;
      return;
    }
    pendingAutoRef.current = null;
    userPrefRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    if (narrow) {
      if (collapsedRef.current) return;
      pendingAutoRef.current = true;
      forcedRef.current = true;
      dispatch(setSidebarCollapsedAuto(true));
      return;
    }
    if (!forcedRef.current) return;
    forcedRef.current = false;
    if (collapsedRef.current === userPrefRef.current) return;
    pendingAutoRef.current = userPrefRef.current;
    dispatch(setSidebarCollapsedAuto(userPrefRef.current));
  }, [narrow, dispatch]);
}
