import { useEffect, useRef } from "react";

import type { RepoStatusEventPayload, Repository } from "@recrest/shared";
import { REPO_STATUS_EVENT } from "@recrest/shared";

import { listen } from "@/lib/tauri";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos, upsertRepo } from "@/store/slices/reposSlice";

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
