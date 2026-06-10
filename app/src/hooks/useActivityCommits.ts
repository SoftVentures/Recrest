import { startTransition, useEffect, useMemo } from "react";

import {
  ACTIVITY_COMMITS_CHUNK_EVENT,
  type ActivityRange,
  type CommitsChunkPayload,
  type RecentCommit,
} from "@recrest/shared";

import { type BucketUnit, bucketCommits, bucketCommitsByRepo } from "@/lib/activity/rangeBuckets";
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
 * Drives the range-commit data: subscribes to the chunk stream and (re)fetches
 * missing subranges whenever the selected range widens or `refreshNonce` bumps.
 *
 * Mount EXACTLY ONCE, app-wide (in `AppLayout`). Every page reads the result
 * through `useActivityCommits` / `useRangeActivity` — a second driver would
 * double every backend `list_commits` scan on each range change.
 */
export function useActivityCommitsSync(): void {
  const dispatch = useAppDispatch();
  const range = useAppSelector(selectSelectedRange);
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

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
}

/**
 * Read-only view of the loaded commits inside the selected range. Safe to call
 * from any number of components — the fetch is driven once by
 * `useActivityCommitsSync` in `AppLayout`.
 */
export function useActivityCommits(): {
  commits: RecentCommit[];
  loading: boolean;
  truncated: boolean;
} {
  return {
    commits: useAppSelector(selectCommitsInRange),
    loading: useAppSelector(selectCommitsLoading),
    truncated: useAppSelector(selectAnyTruncated),
  };
}

export interface RangeActivity {
  commits: RecentCommit[];
  loading: boolean;
  truncated: boolean;
  range: ActivityRange;
  /** Aggregate activity across all repos, oldest → newest. */
  aggregate: number[];
  /** Per-repo activity series (oldest → newest), keyed by repoId. Feeds the
   *  repo-row / repo-card / repo-detail sparklines so they follow the range. */
  byRepo: Map<string, number[]>;
  unit: BucketUnit;
  windowDays: number;
}

/**
 * The global selected range expressed as ready-to-chart activity: an aggregate
 * series plus a per-repo map, both bucketed adaptively (day / week / month) for
 * the window width. This is the single source every page uses to follow the
 * global time range — no more fixed 14-day windows.
 */
export function useRangeActivity(): RangeActivity {
  const { commits, loading, truncated } = useActivityCommits();
  const range = useAppSelector(selectSelectedRange);
  const aggregate = useMemo(() => bucketCommits(commits, range), [commits, range]);
  const perRepo = useMemo(() => bucketCommitsByRepo(commits, range), [commits, range]);
  return {
    commits,
    loading,
    truncated,
    range,
    aggregate: aggregate.buckets,
    byRepo: perRepo.byRepo,
    unit: aggregate.unit,
    windowDays: aggregate.windowDays,
  };
}
