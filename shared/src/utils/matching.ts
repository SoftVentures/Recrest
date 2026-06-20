import { PROVIDER_IDS, type ProviderId } from "../constants/providers.js";

/** Best-effort mapping of a remote URL onto a known provider. */
export function matchProviderFromRemote(remoteUrl: string | null | undefined): ProviderId | null {
  if (!remoteUrl) return null;
  const lower = remoteUrl.toLowerCase();
  if (lower.includes("github.com")) return "github";
  if (lower.includes("gitlab.com") || lower.includes("gitlab.")) return "gitlab";
  if (lower.includes("bitbucket.org") || lower.includes("bitbucket.")) return "bitbucket";
  return null;
}

export function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim();
  // ssh: git@host:owner/repo(.git)
  const sshMatch = trimmed.match(/^git@[^:]+:(.+)$/);
  // https: https://host/owner/repo(.git)
  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/(.+)$/);
  const rest = sshMatch?.[1] ?? httpsMatch?.[1];
  if (!rest) return null;
  const cleaned = rest.replace(/\.git$/, "").replace(/\/+$/, "");
  const [owner, repo] = cleaned.split("/", 2);
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function isKnownProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Converts any git remote URL into the browser-openable web URL for the repo:
 *  `git@github.com:foo/bar.git` → `https://github.com/foo/bar`,
 *  `ssh://git@host:22/foo/bar.git` → `https://host/foo/bar`,
 *  `https://host/foo/bar.git` → `https://host/foo/bar`.
 *  A raw SSH remote can't be opened in a browser as-is, so the open-on-host
 *  affordance must normalise it first. Returns null when the URL can't be
 *  split into host + path. */
export function remoteToWebUrl(remoteUrl: string | null | undefined): string | null {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();

  let host: string | undefined;
  let path: string | undefined;

  // scp-like SSH form: user@host:owner/repo(.git) — no scheme, colon-separated.
  const scp = trimmed.match(/^[^@/]+@([^:/]+):(.+)$/);
  if (scp) {
    host = scp[1];
    path = scp[2];
  } else {
    // scheme form: ssh://, https://, http://, git:// — strip scheme + any auth.
    const schemed = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/(.+)$/i);
    const afterScheme = schemed?.[1] ?? trimmed;
    const afterAuth = afterScheme.includes("@")
      ? afterScheme.slice(afterScheme.indexOf("@") + 1)
      : afterScheme;
    const slash = afterAuth.indexOf("/");
    if (slash === -1) return null;
    host = afterAuth.slice(0, slash);
    path = afterAuth.slice(slash + 1);
  }

  if (!host || !path) return null;
  host = host.replace(/:\d+$/, "");
  const cleanedPath = path
    .replace(/\.git$/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!host || !cleanedPath) return null;
  return `https://${host}/${cleanedPath}`;
}
