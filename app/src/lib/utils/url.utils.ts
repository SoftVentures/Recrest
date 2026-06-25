/**
 * Normalize a user-typed provider host (GitLab self-hosted, future
 * Enterprise GitHub, Bitbucket Server, etc.):
 *   - trim whitespace
 *   - default to `https://` when no scheme is given
 *   - strip trailing slashes
 *
 * Does NOT append any API path (`/api/v4` etc.) — that's the backend's
 * responsibility per provider, and returning the bare root keeps the value
 * reusable as both an API base and a display string.
 *
 * Returns an empty string for empty / whitespace-only input so callers can
 * fail loudly with a copy string rather than silently producing a bogus
 * default URL.
 */
export function normalizeProviderBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
