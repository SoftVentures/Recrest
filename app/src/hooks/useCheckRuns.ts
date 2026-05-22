import { useEffect, useState } from "react";

import { type CheckRunSummary, type RecentCommit, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  commits?: readonly RecentCommit[];
}

export function useCheckRuns({ commits }: Args = {}): {
  summaries: CheckRunSummary[];
  loading: boolean;
} {
  const [summaries, setSummaries] = useState<CheckRunSummary[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  const refsKey = commits?.map((c) => c.sha).join("|") ?? "";

  useEffect(() => {
    if (!isTauri()) {
      setSummaries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    invoke<CheckRunSummary[]>(TauriCommand.LIST_CHECK_RUNS, { commits: commits ?? [] })
      .then((list) => {
        if (!cancelled) setSummaries(list);
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
