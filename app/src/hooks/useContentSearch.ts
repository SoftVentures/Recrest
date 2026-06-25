import { useEffect, useRef, useState } from "react";

import { type SearchHit, TauriCommand } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

/** A content walk is comparatively expensive, so only fire on a deliberate
 *  typing pause and once the query clears a meaningful length. */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 450;

export interface ContentSearch {
  hits: SearchHit[];
  searching: boolean;
}

/**
 * Debounced file-content search across the tracked repos — the relocated
 * "find across repositories" feature, now living in the search palette's
 * content tab. `scopeRepoId` narrows the walk to a single repo; `undefined`
 * searches every repo. Inert (returns nothing, runs no query) unless `enabled`
 * is set and the query clears `MIN_QUERY`, so the other tab costs nothing.
 */
export function useContentSearch(
  query: string,
  scopeRepoId: string | undefined,
  enabled: boolean,
): ContentSearch {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  // Monotonic id so a slow earlier search resolving after a newer one (or after
  // the tab/scope/query changed) can't clobber the current results.
  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_QUERY) {
      seqRef.current++;
      setHits([]);
      setSearching(false);
      return;
    }
    const seq = ++seqRef.current;
    setSearching(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const result = await invoke<SearchHit[]>(TauriCommand.FIND_ACROSS_REPOS, {
            query: q,
            repoId: scopeRepoId,
          });
          if (seqRef.current === seq) setHits(result);
        } catch {
          if (seqRef.current === seq) setHits([]);
        } finally {
          if (seqRef.current === seq) setSearching(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, scopeRepoId, enabled]);

  return { hits, searching };
}
