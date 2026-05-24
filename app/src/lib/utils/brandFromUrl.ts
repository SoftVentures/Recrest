import { Provider, type ProviderId } from "@/lib/constants/providers.constants";

export function brandFromUrl(url: string | null | undefined): ProviderId | null {
  if (!url) return null;
  const rest = url.startsWith("git@")
    ? url.slice(4).split(":")[0]
    : (url.split("://")[1] ?? url).split("@").pop()?.split(/[/:]/)[0];
  const host = rest?.toLowerCase() ?? "";
  if (host.endsWith("github.com")) return Provider.GITHUB;
  if (host.endsWith("gitlab.com")) return Provider.GITLAB;
  if (host.endsWith("bitbucket.org")) return Provider.BITBUCKET;
  return null;
}
