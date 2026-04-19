import { type SVGProps } from "react";

import { type SimpleIcon, siBitbucket, siGithub, siGitlab } from "simple-icons";

export type BrandSlug = "github" | "gitlab" | "bitbucket";

const BRAND_ICONS: Record<BrandSlug, SimpleIcon> = {
  github: siGithub,
  gitlab: siGitlab,
  bitbucket: siBitbucket,
};

interface BrandIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  slug: BrandSlug;
  size?: number;
  /** `"currentColor"` (default) picks up surrounding text colour;
   *  `"brand"` uses Simple Icons' official hex. */
  color?: "currentColor" | "brand" | string;
  title?: string;
}

export function BrandIcon({
  slug,
  size = 16,
  color = "currentColor",
  title,
  ...rest
}: BrandIconProps) {
  const icon = BRAND_ICONS[slug];
  const fill = color === "brand" ? `#${icon.hex}` : color;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      role="img"
      aria-label={title ?? icon.title}
      style={{ flexShrink: 0 }}
      {...rest}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** Best-effort mapping from a remote URL's host to the matching Simple Icon.
 *  Self-hosted instances fall back to `null` — caller decides whether to
 *  render a generic glyph or nothing. */
// eslint-disable-next-line react-refresh/only-export-components
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
