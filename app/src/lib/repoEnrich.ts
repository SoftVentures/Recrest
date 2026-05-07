import type { Repository, RepositoryGroup } from "@recrest/shared";

/** Matches paths that live inside an OS trash/recycle-bin folder, across
 * Windows, macOS, and Linux conventions. Anchored to a path-separator on
 * either side so we don't mis-match a user folder literally named `Trash`.
 *
 * Windows:  `X:\$RECYCLE.BIN\S-1-5-...\...`  (case-insensitive, `$` literal)
 * macOS:    `/Users/x/.Trash`, `/Volumes/x/.Trashes`
 * Linux:    `~/.local/share/Trash/...`, `/media/x/.Trash-1000/...`
 */
export const TRASH_PATH_RE =
  /(^|[\\/])(\$recycle\.bin|\.trash(es)?|\.trash-\d+|\.local[\\/]share[\\/]trash)([\\/]|$)/i;

export function isTrashPath(path: string): boolean {
  return TRASH_PATH_RE.test(path);
}

/** UI-friendly projection of a Rust-provided `Repository`.
 *
 *  Every field here is derived either from immutable repo metadata
 *  (`group` from filesystem parent) or from Rust-provided status fields
 *  (`lang`, `activity`, `added`, `removed`). The `pinned` flag is the only
 *  client-only concept, stored in `ui.pinnedRepoIds`. */
export interface EnrichedRepo extends Repository {
  group: string;
  lang: string;
  /** Per-language share (0..1) from the backend's byte breakdown, normalised.
   *  Empty object when no breakdown is available. Keys preserve the original
   *  language names (case matters for `languageByName`). */
  langShares: Record<string, number>;
  added: number;
  removed: number;
  filesChanged: number;
  activity: number[];
  pinned: boolean;
  clean: boolean;
}

const SEP = /[\\/]/;

function segmentBeforeName(path: string): string | null {
  const parts = path.split(SEP).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 2] ?? null;
}

export function enrichRepo(
  repo: Repository,
  pinnedIds: readonly string[] = [],
  groups: Record<string, RepositoryGroup> = {},
): EnrichedRepo {
  // Prefer the explicit group's display name (so the UI shows
  // `Open Source` instead of the slugged `open-source` id) and fall back to
  // the parent path segment for ungrouped repos that still want a label.
  const group =
    (repo.groupId && groups[repo.groupId]?.name) || segmentBeforeName(repo.path) || "Projects";
  const lang = repo.status.language ?? "mixed";
  // Use the *real* counts from git2 (not the `changedFiles` array, which is
  // capped at 100 server-side — a repo with 108 changes would else read "100").
  const filesChanged =
    repo.status.staged + repo.status.unstaged + repo.status.untracked + repo.status.conflicted;

  // "clean" = untouched for the full activity window (no commits) AND nothing
  // in flight locally. The commit-activity window is 14 days, so clean == "no
  // commit in the last two weeks + no dirty working tree + not ahead of origin".
  const noRecentCommits = repo.status.commitActivity.every((v) => v === 0);
  const clean =
    !repo.status.dirty && filesChanged === 0 && repo.status.ahead === 0 && noRecentCommits;

  // Normalise the language byte breakdown into 0..1 shares so downstream
  // aggregations don't have to care whether the backend returned bytes or
  // already-normalised fractions.
  const langShares: Record<string, number> = {};
  const rawLangs = repo.status.languages;
  if (rawLangs) {
    let sum = 0;
    for (const v of Object.values(rawLangs)) sum += v;
    if (sum > 0) {
      for (const [k, v] of Object.entries(rawLangs)) langShares[k] = v / sum;
    }
  }

  return {
    ...repo,
    group,
    lang,
    langShares,
    added: repo.status.addedLines,
    removed: repo.status.removedLines,
    filesChanged,
    activity: repo.status.commitActivity,
    pinned: pinnedIds.includes(repo.id),
    clean,
  };
}

export function enrichRepos(
  repos: Repository[],
  pinnedIds: readonly string[] = [],
  groups: Record<string, RepositoryGroup> = {},
) {
  return repos.filter((r) => !isTrashPath(r.path)).map((r) => enrichRepo(r, pinnedIds, groups));
}
