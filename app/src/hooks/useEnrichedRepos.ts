import { useMemo } from "react";

import { type EnrichedRepo, enrichRepos } from "@/lib/repoEnrich";
import { useAppSelector } from "@/store/hooks";

import { useRepos } from "./useRepos";

/** Returns the current repo list plus UI-only enrichment (group/lang/activity/pinned). */
export function useEnrichedRepos(): EnrichedRepo[] {
  const repos = useRepos();
  const pinned = useAppSelector((s) => s.ui.pinnedRepoIds);
  return useMemo(() => enrichRepos(repos, pinned), [repos, pinned]);
}
