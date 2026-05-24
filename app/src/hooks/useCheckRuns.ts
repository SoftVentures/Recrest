import { useEffect, useState } from "react";

import { type CheckRunSummary, type RecentCommit, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  commits?: readonly RecentCommit[];
}

/** Aggregates CI check-run summaries across every repo that has commits in the
 *  passed window. The Rust `list_check_runs` command is strictly per-repo
 *  (`repoId` + `shas`), so this hook fans out one invoke per repo and merges
 *  the results before handing them to the activity-page rollups. */
export function useCheckRuns({ commits }: Args = {}): {
  summaries: CheckRunSummary[];
  loading: boolean;
} {
  const [summaries, setSummaries] = useState<CheckRunSummary[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  const refsKey = commits?.map((c) => `${c.repoId}:${c.sha}`).join("|") ?? "";

  useEffect(() => {
    if (!isTauri()) {
      setSummaries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const list = commits ?? [];
    if (list.length === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    // Group SHAs per repo so we issue exactly one IPC call per repo.
    const byRepo = new Map<string, string[]>();
    for (const c of list) {
      const bucket = byRepo.get(c.repoId);
      if (bucket) bucket.push(c.sha);
      else byRepo.set(c.repoId, [c.sha]);
    }
    const localTzOffsetMinutes = -new Date().getTimezoneOffset();

    const calls = Array.from(byRepo.entries()).map(([repoId, shas]) =>
      invoke<CheckRunSummary[]>(TauriCommand.LIST_CHECK_RUNS, {
        repoId,
        shas,
        localTzOffsetMinutes,
      }).catch(() => [] as CheckRunSummary[]),
    );

    Promise.all(calls)
      .then((results) => {
        if (cancelled) return;
        setSummaries(results.flat());
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsKey, nonce]);

  return { summaries, loading };
}
