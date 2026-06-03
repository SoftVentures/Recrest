import type { FileDiff } from "@recrest/shared";

export interface DiffStats {
  files: number;
  additions: number;
  deletions: number;
}

// Derive per-MR change totals from the loaded diff. Cheap O(lines) walk over
// the hunks — every "add"/"remove" kind counts as exactly one line. Used as a
// fallback for providers (notably GitLab's MR-list endpoint) that don't
// surface additions/deletions on the list response.
export function deriveDiffStats(diff: FileDiff[] | undefined): DiffStats {
  if (!diff || diff.length === 0) return { files: 0, additions: 0, deletions: 0 };
  let additions = 0;
  let deletions = 0;
  for (const file of diff) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === "add") additions += 1;
        else if (line.kind === "remove") deletions += 1;
      }
    }
  }
  return { files: diff.length, additions, deletions };
}
