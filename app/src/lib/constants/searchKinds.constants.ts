/**
 * Discriminator literals for `SearchResult.kind` in `useSearch.ts`.
 *
 * Search results come in four flavours (global nav targets, repos, merge
 * requests, branches). The kind is part of the result object so the overlay
 * can group items into sections and pick the right icon / row variant. Keep
 * this list aligned with `OverallSearch`'s render branches. (File-content hits
 * in the "Repo" tab are raw `SearchHit`s, not `SearchResult`s — they render via
 * their own row variant and don't need a kind here.)
 */
export const SearchKind = {
  NAV: "nav",
  REPO: "repo",
  MR: "mr",
  BRANCH: "branch",
} as const;

export type SearchKind = (typeof SearchKind)[keyof typeof SearchKind];

/**
 * The two scopes the search palette can run in. `GLOBAL` searches everything;
 * `REPO` scopes quick-switch results to the active repo and adds file-content
 * hits. Shared with the component and its tests so the tab ids stay a single
 * source of truth.
 */
export const SearchTab = {
  GLOBAL: "global",
  REPO: "repo",
} as const;

export type SearchTab = (typeof SearchTab)[keyof typeof SearchTab];
