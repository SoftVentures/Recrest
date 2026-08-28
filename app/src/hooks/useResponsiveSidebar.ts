import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { useDevice } from "@/hooks/useDevice";
import { setSidebarCollapsedAuto } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { matchMediaDown } from "@/theme/scale";

/** Design width below which the sidebar collapses even on "laptop"-class
 *  devices — the macOS min window (1100×720) sits here, and an expanded
 *  sidebar at that width starves the main pane (RepoDetail header wraps
 *  awkwardly, action cluster drops to its own row, etc.).
 *
 *  This is a *design* width: it is multiplied by the active UI scale before it
 *  becomes a media query, exactly like the theme breakpoints. At scale 1.25 a
 *  1440-px window only has 1152 design pixels of room, so it is compact — the
 *  old `zoom` layout made `matchMedia` report the raw 1440 and this never
 *  fired. */
const COMPACT_LAYOUT_BREAKPOINT_PX = 1200;

function compactLayoutQuery(uiScale: number): string {
  return matchMediaDown(COMPACT_LAYOUT_BREAKPOINT_PX - 1, uiScale);
}

function makeCompactLayoutStore(uiScale: number) {
  const query = compactLayoutQuery(uiScale);
  return {
    subscribe(callback: () => void): () => void {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    getSnapshot(): boolean {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    getServerSnapshot(): boolean {
      return false;
    },
  };
}

/**
 * Auto-collapses the sidebar on narrow viewports while remembering the user's
 * manual preference, and restores that preference once the window is wide
 * again.
 *
 * The automatic collapse is dispatched as `setSidebarCollapsedAuto`, which
 * `settingsBackendSync` deliberately does **not** persist. Persisting it made
 * one narrow session overwrite the stored preference for good: the next cold
 * start hydrated `sidebarCollapsed: true` and widening the window had nothing
 * to restore. Only a collapse the user performed themselves (`toggleSidebar` /
 * `setSidebarCollapsed` from the sidebar chrome) is written back to settings.
 *
 * The preference itself lives in the store (`ui.sidebarCollapsedPref`) rather
 * than in a ref here, because settings hydration lands in the reducer and this
 * hook cannot tell a hydration echo apart from a real toggle click. The reducer
 * suppresses the effective-value write while `ui.sidebarAutoCollapsed` is set,
 * which is what stops `loadSettings`/`saveSettings` from silently expanding the
 * sidebar on a compact window (and never collapsing it again, because the
 * viewport class this effect keys on never changed).
 */
export function useResponsiveSidebar(): void {
  const device = useDevice();
  const uiScale = useAppSelector((s) => s.settings.uiScale);
  // Re-created per scale so `useSyncExternalStore` re-subscribes to the new
  // query instead of holding on to the previous scale's threshold.
  const compactStore = useMemo(() => makeCompactLayoutStore(uiScale), [uiScale]);
  const compact = useSyncExternalStore(
    compactStore.subscribe,
    compactStore.getSnapshot,
    compactStore.getServerSnapshot,
  );
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const autoCollapsed = useAppSelector((s) => s.ui.sidebarAutoCollapsed);
  const collapsedPref = useAppSelector((s) => s.ui.sidebarCollapsedPref);
  const narrow = device.isMobile || device.isTablet || compact;

  const prefRef = useRef(collapsedPref);
  prefRef.current = collapsedPref;

  /** We are the reason the sidebar is collapsed right now. */
  const forcedRef = useRef(false);
  /** The user expanded the sidebar back while the viewport is still narrow.
   *  The effect re-runs on every `collapsed` change (that is what makes it
   *  immune to hydration), so without this it would re-collapse on the same
   *  tick and the toggle button would look dead. */
  const userOverrodeRef = useRef(false);

  useEffect(() => {
    if (!narrow) {
      forcedRef.current = false;
      userOverrodeRef.current = false;
      // Only release a collapse we imposed — a user-driven one has to survive.
      if (autoCollapsed) dispatch(setSidebarCollapsedAuto(prefRef.current, false));
      return;
    }
    if (collapsed) return;
    // Expanded again while still narrow, and we are the ones who collapsed it:
    // only a user-driven write clears `sidebarAutoCollapsed`, so this is the
    // user overruling us. Stand down until the viewport changes class.
    if (forcedRef.current) userOverrodeRef.current = true;
    if (userOverrodeRef.current) return;
    forcedRef.current = true;
    dispatch(setSidebarCollapsedAuto(true, true));
  }, [narrow, collapsed, autoCollapsed, dispatch]);
}
