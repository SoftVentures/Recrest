import { useEffect, useState } from "react";

import type { GitInfo } from "@recrest/shared";

import { systemService } from "@/lib/tauri/services";

type State = { status: "loading"; info: null } | { status: "ready"; info: GitInfo | null };

// Module-level cache so multiple consumers don't each spawn `git --version`.
let cached: GitInfo | null | undefined = undefined;
let inflight: Promise<GitInfo | null> | null = null;

async function loadOnce(): Promise<GitInfo | null> {
  if (cached !== undefined) return cached;
  if (!inflight) {
    inflight = systemService.getGitInfo().then((result) => {
      cached = result;
      inflight = null;
      return result;
    });
  }
  return inflight;
}

/**
 * Returns the cached system-git detection result. First consumer triggers
 * a single `git --version` call; subsequent consumers read from the cache.
 * Call `refresh()` to re-probe (e.g. after user installs git and comes back).
 */
export function useGitInfo(): State & { refresh: () => void } {
  const [state, setState] = useState<State>(() =>
    cached !== undefined ? { status: "ready", info: cached } : { status: "loading", info: null },
  );

  useEffect(() => {
    if (cached !== undefined) return;
    let cancelled = false;
    void loadOnce().then((info) => {
      if (!cancelled) setState({ status: "ready", info });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => {
    cached = undefined;
    inflight = null;
    setState({ status: "loading", info: null });
    void loadOnce().then((info) => setState({ status: "ready", info }));
  };

  return { ...state, refresh };
}
