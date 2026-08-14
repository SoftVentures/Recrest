import { useEffect, useRef } from "react";

import {
  REPO_RESCAN_INTERVAL_MS,
  REPO_RESCAN_MIN_INTERVAL_MS,
  WINDOW_FOCUSED_EVENT,
} from "@recrest/shared";

import { isTauri, listen } from "@/lib/tauri";
import { isThrottleElapsed } from "@/lib/utils/throttle.utils";
import { backgroundScanForRepos } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Re-walks the configured scan roots so repositories created or cloned outside
 * the app become visible without a restart.
 *
 * The filesystem watcher cannot cover this: it subscribes to repos that are
 * already registered, so a folder that only just became a repo is invisible to
 * it. Two triggers feed this hook — a slow interval and the backend's window
 * focus event (returning to the app is the moment a user expects fresh data).
 *
 * Both triggers share one throttle because a scan walks the entire tree under
 * every root; without it, alt-tabbing would start a full walk each time.
 *
 * Dispatching `backgroundScanForRepos` (not `scanForRepos`) keeps `repos.loading`
 * untouched — the header refresh indicator reads that flag, and an unattended
 * scan must not make the app look busy.
 */
export function useRepoAutoRescan(): void {
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);

  // Read paths through a ref so adding a scan root doesn't tear down and
  // restart the interval (which would reset its phase on every settings save).
  const scanPathsRef = useRef(scanPaths);
  scanPathsRef.current = scanPaths;

  const lastScanRef = useRef<number | null>(null);
  // The time throttle alone can't prevent overlap: a walk over a large root can
  // outlive `REPO_RESCAN_MIN_INTERVAL_MS`, and the next trigger would then start
  // a second walk over the same tree. The end state stays consistent (the
  // backend serialises on its config and each `fulfilled` replaces the store
  // wholesale), so this only buys back the wasted disk pass.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;

    // Seeded with mount time rather than left at null: the bootstrap already
    // scans on boot, so an early focus event must not immediately walk the same
    // tree again. Seeding here and not in the `useRef` initialiser because
    // `Date.now()` during render is impure (react-hooks/purity) — the effect
    // runs before any interval or focus event can fire, so the guard still holds.
    lastScanRef.current = Date.now();

    const maybeScan = () => {
      const paths = scanPathsRef.current;
      if (paths.length === 0) return;
      if (inFlightRef.current) return;
      if (!isThrottleElapsed(lastScanRef.current, REPO_RESCAN_MIN_INTERVAL_MS)) return;
      lastScanRef.current = Date.now();
      inFlightRef.current = true;
      void dispatch(backgroundScanForRepos(paths)).finally(() => {
        inFlightRef.current = false;
      });
    };

    const interval = window.setInterval(maybeScan, REPO_RESCAN_INTERVAL_MS);

    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const off = await listen(WINDOW_FOCUSED_EVENT, maybeScan);
      if (cancelled) off();
      else unlisten = off;
    })();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unlisten?.();
      // Unmount must not leave the guard latched: this hook remounts on route
      // changes while an earlier dispatch may still be pending, and a stuck
      // `true` would silence rescans for the rest of the session.
      inFlightRef.current = false;
    };
  }, [dispatch]);
}
