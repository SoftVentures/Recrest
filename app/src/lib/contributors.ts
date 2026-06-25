/** Contributors leaderboard for the Recrest repo itself (shown in Settings →
 *  About). Data comes straight from GitHub's public REST API, which CSP
 *  explicitly allows (`connect-src https://api.github.com`) and which is
 *  already sorted by commit count descending — so the ranking is the API's,
 *  always reflecting the latest state of the project. Unauthenticated (public
 *  repo); a single in-memory cache keeps us well under the 60-req/h limit. */

const CONTRIBUTORS_API =
  "https://api.github.com/repos/SoftVentures/Recrest/contributors?per_page=100";

export interface Contributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
  isBot: boolean;
}

/** Raw shape from `GET /repos/{owner}/{repo}/contributors` — every field is
 *  treated as optional/unknown because we never trust an external payload. */
interface RawContributor {
  login?: unknown;
  avatar_url?: unknown;
  html_url?: unknown;
  contributions?: unknown;
  type?: unknown;
}

const asString = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/** Map + filter + rank the GitHub payload into our DTO. Pure, so it carries the
 *  unit tests; `fetchContributors` is the thin IO wrapper around it. Entries
 *  without a usable `login` are dropped; the rest are sorted by commit count
 *  descending (GitHub already does this, but we don't depend on it). */
export function normalizeContributors(raw: unknown): Contributor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): Contributor | null => {
      const r = entry as RawContributor;
      const login = asString(r.login);
      if (!login) return null;
      return {
        login,
        avatarUrl: asString(r.avatar_url) ?? "",
        profileUrl: asString(r.html_url) ?? `https://github.com/${login}`,
        contributions: typeof r.contributions === "number" ? r.contributions : 0,
        isBot: r.type === "Bot" || /\[bot\]$/i.test(login),
      };
    })
    .filter((c): c is Contributor => c !== null)
    .sort((a, b) => b.contributions - a.contributions);
}

let cache: Promise<Contributor[]> | null = null;

/** Fetch (once per session) the ranked contributor list. On failure the cache
 *  is cleared so a later mount can retry. */
export function fetchContributors(): Promise<Contributor[]> {
  if (cache) return cache;
  cache = (async () => {
    const res = await fetch(CONTRIBUTORS_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      throw new Error(`GitHub contributors API responded ${res.status}`);
    }
    return normalizeContributors(await res.json());
  })().catch((err) => {
    cache = null;
    throw err;
  });
  return cache;
}
