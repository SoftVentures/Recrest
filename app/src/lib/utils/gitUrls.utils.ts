/**
 * Converts a git remote URL into a web URL pointing at a specific commit.
 *
 * Handles the two ubiquitous remote formats:
 *  - `git@host:owner/repo.git`   → `https://host/owner/repo/commit/<sha>`
 *  - `https://host/owner/repo.git` → `https://host/owner/repo/commit/<sha>`
 *
 * Returns `null` when no remote is available so callers can render a
 * non-clickable surface without an extra guard.
 */
export function commitUrl(remote: string | null | undefined, sha: string): string | null {
  if (!remote) return null;
  const https = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  return `${https}/commit/${sha}`;
}
