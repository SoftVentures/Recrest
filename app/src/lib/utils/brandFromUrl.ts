import type { BrandSlug } from "@/components/atoms/icons/BrandIcon";

export function brandFromUrl(url: string | null | undefined): BrandSlug | null {
  if (!url) return null;
  const rest = url.startsWith("git@")
    ? url.slice(4).split(":")[0]
    : (url.split("://")[1] ?? url).split("@").pop()?.split(/[/:]/)[0];
  const host = rest?.toLowerCase() ?? "";
  if (host.endsWith("github.com")) return "github";
  if (host.endsWith("gitlab.com")) return "gitlab";
  if (host.endsWith("bitbucket.org")) return "bitbucket";
  return null;
}
