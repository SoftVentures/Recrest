import { useEffect, useMemo, useRef } from "react";

import type { RepoRemovedEventPayload, RepoStatusEventPayload, Repository } from "@recrest/shared";
import {
  REPO_REMOVED_EVENT,
  REPO_STATUS_EVENT,
  UNKNOWN_REPO_RELOAD_MIN_INTERVAL_MS,
} from "@recrest/shared";

import { listen } from "@/lib/tauri";
import { isThrottleElapsed } from "@/lib/utils/throttle.utils";
import { loadRepos, repoRemoved, upsertRepo } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Module scope, not a ref: `useRepos` is mounted several times at once on a
 * single route (Dashboard, QuickActionsCard, OverallSearch, useSearch), and a
 * per-instance throttle would let one unknown-repo event fan out into one
 * `list_repos` call per mounted instance. They all refetch the same list, so
 * the floor has to be shared across them.
 */
const unknownRepoReload = { lastAt: null as number | null };

/**
 * Clears the shared unknown-repo throttle. Module state outlives a single test
 * case, so a spec that exercises that branch would otherwise silence the next
 * one in the same file.
 */
export function resetUnknownRepoReloadThrottle(): void {
  unknownRepoReload.lastAt = null;
}

/**
 * Returns the repo list and subscribes to the live repo events so dirty-flag /
 * ahead-behind changes and disappearing repos flow into the store as they
 * happen.
 *
 * The fresh `itemsRef` keeps the event handler reading current items without
 * recreating the listener when the items map changes (otherwise a flurry of
 * `notify` events would thrash).
 */
export function useRepos(): Repository[] {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.repos.items);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    void dispatch(loadRepos());
  }, [dispatch]);

  useEffect(() => {
    const offs: Array<() => void> = [];
    let cancelled = false;

    const track = (off: () => void) => {
      if (cancelled) off();
      else offs.push(off);
    };

    void (async () => {
      track(
        await listen<RepoStatusEventPayload>(REPO_STATUS_EVENT, (event) => {
          const { repoId, status } = event.payload;
          const existing = itemsRef.current[repoId];
          if (!existing) {
            // The backend knows a repo the store doesn't — it was registered
            // after our last list (clone, add, or a scan on the backend side).
            // Refetching is the only way to learn its metadata; dropping the
            // event left such repos invisible until the next app start.
            if (isThrottleElapsed(unknownRepoReload.lastAt, UNKNOWN_REPO_RELOAD_MIN_INTERVAL_MS)) {
              unknownRepoReload.lastAt = Date.now();
              void dispatch(loadRepos());
            }
            return;
          }
          // `missing: false` is not redundant with `...existing`: a status the
          // backend could actually read is proof the repo is back on disk. Only
          // a scan or a fresh `list_repos` cleared the flag before, so a repo
          // that briefly lost its `.git` (re-init, editor moving the folder)
          // stayed greyed out with every action disabled for the whole session.
          dispatch(upsertRepo({ ...existing, status, missing: false }));
        }),
      );

      track(
        await listen<RepoRemovedEventPayload>(REPO_REMOVED_EVENT, (event) => {
          dispatch(repoRemoved(event.payload));
        }),
      );
    })();

    return () => {
      cancelled = true;
      for (const off of offs) off();
    };
  }, [dispatch]);

  // Memoise so consumers get a stable array reference between renders — a raw
  // `Object.values(items)` returns a new array every render, which defeats
  // memoisation/effect-dependency checks downstream.
  return useMemo(() => Object.values(items), [items]);
}
