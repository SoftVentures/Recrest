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
