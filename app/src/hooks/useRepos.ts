import { useEffect, useRef } from "react";

import type { RepoStatusEventPayload, Repository } from "@recrest/shared";
import { REPO_STATUS_EVENT } from "@recrest/shared";

import { listen } from "@/lib/tauri";
import { loadRepos, upsertRepo } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Returns the repo list and subscribes to live repo://status events so
 * dirty-flag / ahead-behind changes flow into the store as they happen.
 *
 * Mirrors the src-old useRepos hook. The fresh `itemsRef` keeps the event
 * handler reading current items without recreating the listener when the
 * items map changes (otherwise a flurry of `notify` events would thrash).
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
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const off = await listen<RepoStatusEventPayload>(REPO_STATUS_EVENT, (event) => {
        const { repoId, status } = event.payload;
        const existing = itemsRef.current[repoId];
        if (!existing) return;
        dispatch(upsertRepo({ ...existing, status }));
      });
      if (cancelled) off();
      else unlisten = off;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [dispatch]);

  return Object.values(items);
}
