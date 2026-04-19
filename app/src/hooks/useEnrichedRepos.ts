import { useMemo } from "react";

import { useRepos } from "@/hooks/useRepos";
import { type EnrichedRepo, enrichRepos } from "@/lib/repoEnrich";
import { useAppSelector } from "@/store/hooks";

/** Returns the current repo list plus UI-only enrichment (group/lang/activity/pinned). */
export function useEnrichedRepos(): EnrichedRepo[] {
  const repos = useRepos();
  const pinned = useAppSelector((s) => s.ui.pinnedRepoIds);
  return useMemo(() => enrichRepos(repos, pinned), [repos, pinned]);
}
