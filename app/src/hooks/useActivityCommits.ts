import { startTransition, useEffect } from "react";

import {
  ACTIVITY_COMMITS_CHUNK_EVENT,
  type CommitsChunkPayload,
  type RecentCommit,
} from "@recrest/shared";

import { isTauri, listen } from "@/lib/tauri";
import { commitsChunkReceived, fetchCommitsRange } from "@/store/actions/activity.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAnyTruncated,
  selectCommitsInRange,
  selectCommitsLoading,
  selectSelectedRange,
} from "@/store/selectors/activity.selectors";

/**
 * Range-driven replacement for `useRecentCommits`: subscribes to the chunk
 * stream, (re)fetches missing subranges whenever the selected range widens,
 * and refetches on the global `refreshNonce`.
 *
 * The listener subscription mirrors `useRepos` — `listen` resolves to an
 * unsubscribe function, so we await it in an async IIFE and guard against the
 * effect being torn down before the subscription resolves.
 */
export function useActivityCommits(): {
  commits: RecentCommit[];
  loading: boolean;
  truncated: boolean;
} {
  const dispatch = useAppDispatch();
  const range = useAppSelector(selectSelectedRange);
  const nonce = useAppSelector((s) => s.ui.refreshNonce);
  const commits = useAppSelector(selectCommitsInRange);
  const loading = useAppSelector(selectCommitsLoading);
  const truncated = useAppSelector(selectAnyTruncated);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const off = await listen<CommitsChunkPayload>(ACTIVITY_COMMITS_CHUNK_EVENT, (event) => {
        // Chunk batches can be 1,000 commits each — mark the store update as a
        // transition so React keeps clicks/typing responsive while the page's
        // chart aggregations re-render behind it.
        startTransition(() => {
          dispatch(commitsChunkReceived(event.payload));
        });
      });
      if (cancelled) off();
      else unlisten = off;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isTauri()) return;
    void dispatch(fetchCommitsRange({ range, requestId: crypto.randomUUID() }));
  }, [dispatch, range, nonce]);

  return { commits, loading, truncated };
}
