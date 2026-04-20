import { useEffect, useMemo, useState } from "react";

import { type CheckRunSummary, type RecentCommit, TauriCommand } from "@recrest/shared";

import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  commits: readonly RecentCommit[];
}

/** Fetches aggregated CI check-run summaries per repo and local day, using the
 *  SHAs the caller already has from `useRecentCommits`. Fans out per repo,
 *  flattens, and re-runs on `refreshNonce`. Empty outside Tauri. */
export function useCheckRuns({ commits }: Args): {
  summaries: CheckRunSummary[];
  loading: boolean;
} {
  const repos = useEnrichedRepos();
  const [summaries, setSummaries] = useState<CheckRunSummary[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  // `useRepos` + `useRecentCommits` both return fresh references every render.
  // We derive a stable string key and rebuild the SHA map *inside* the effect
  // so only value-level changes (not reference churn) trigger a refetch.
  const commitKey = useMemo(
    () =>
      commits.length === 0
        ? ""
        : commits
            .map((c) => `${c.repoId}:${c.sha}`)
            .sort()
            .join("|"),
    [commits],
  );
  const repoKey = useMemo(
    () =>
      repos
        .filter((r) => r.remoteUrl && r.providerId)
        .map((r) => r.id)
        .join(","),
    [repos],
  );

  useEffect(() => {
    if (!isTauri() || repoKey === "" || commitKey === "") {
      setSummaries([]);
      setLoading(false);
      return;
    }
    const shasByRepo = new Map<string, string[]>();
    for (const pair of commitKey.split("|")) {
      const [repoId, sha] = pair.split(":");
      if (!repoId || !sha) continue;
      const list = shasByRepo.get(repoId);
      if (list) list.push(sha);
      else shasByRepo.set(repoId, [sha]);
    }
    for (const [id, list] of shasByRepo) {
      shasByRepo.set(id, [...new Set(list)].slice(0, 50));
    }
    const repoIds = repoKey.split(",").filter((id) => shasByRepo.has(id));
    if (repoIds.length === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const offset = -new Date().getTimezoneOffset();
    Promise.allSettled(
      repoIds.map((repoId) =>
        invoke<CheckRunSummary[]>(TauriCommand.LIST_CHECK_RUNS, {
          repoId,
          shas: shasByRepo.get(repoId) ?? [],
          localTzOffsetMinutes: offset,
        }),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const merged: CheckRunSummary[] = [];
        for (const r of results) {
          if (r.status === "fulfilled") merged.push(...r.value);
        }
        setSummaries(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoKey, commitKey, nonce]);

  return { summaries, loading };
}
