/**
 * Heuristic recognition of automated authors (GitHub Apps, common CI bots,
 * Renovate, etc.). Lets the UI render a robot icon instead of trying to look
 * up a Gravatar that will never exist.
 *
 * Two layers:
 *  1. The `[bot]` suffix GitHub uses for every installed GitHub App
 *     (`dependabot[bot]`, `github-actions[bot]`, ...). This catches the
 *     long tail of less-common apps with one rule.
 *  2. A small allow-list for the handful of well-known automation accounts
 *     that don't carry the `[bot]` suffix (GitLab/Bitbucket bots, classic
 *     username-only bots like `renovate-bot`).
 */
const KNOWN_BOTS: ReadonlyArray<RegExp> = [
  /^dependabot(?:-preview)?$/i,
  /^renovate(?:-bot)?$/i,
  /^github-actions$/i,
  /^mergify$/i,
  /^pre-commit-ci$/i,
  /^allcontributors$/i,
  /^imgbot$/i,
  /^snyk-bot$/i,
  /^codecov(?:-commenter)?$/i,
  /^kodiakhq$/i,
  /^whitesource-bolt-for-github$/i,
];

export function isBotAuthor(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  // Strip a leading `@` so handles copied with the `@` still match.
  const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (/\[bot\]$/i.test(handle)) return true;
  return KNOWN_BOTS.some((re) => re.test(handle));
}
