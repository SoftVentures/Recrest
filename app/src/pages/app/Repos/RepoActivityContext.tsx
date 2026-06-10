import { createContext, useContext } from "react";

/**
 * Ambient per-repo activity series (oldest → newest), keyed by repoId, derived
 * from the global selected range. The Repos page provides it from
 * `useRangeActivity().byRepo`; repo rows/cards read their own series without
 * prop-drilling through the list layers.
 *
 * `null` (no provider) means "not range-aware" — consumers fall back to the
 * repo's own fixed window (used in tests/stories). When a provider IS present
 * but a repo has no commits in the range, the series is empty (a real "no
 * activity in this window"), not the fallback.
 */
const RepoActivitySeriesContext = createContext<Map<string, number[]> | null>(null);

export const RepoActivitySeriesProvider = RepoActivitySeriesContext.Provider;

const EMPTY: number[] = [];

export function useRepoActivitySeries(repoId: string, fallback: number[]): number[] {
  const map = useContext(RepoActivitySeriesContext);
  if (!map) return fallback;
  return map.get(repoId) ?? EMPTY;
}
