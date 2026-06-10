/**
 * Discriminator literals for `SearchResult.kind` in `useSearch.ts`.
 *
 * Search results come in four flavours (global nav targets, repos, merge
 * requests, branches). The kind is part of the result object so the overlay
 * can group items into sections and pick the right icon / row variant. Keep
 * this list aligned with `OverallSearch`'s render branches.
 */
export const SearchKind = {
  NAV: "nav",
  REPO: "repo",
  MR: "mr",
  BRANCH: "branch",
} as const;

export type SearchKind = (typeof SearchKind)[keyof typeof SearchKind];
