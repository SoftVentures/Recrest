import { type SVGProps } from "react";

import { PROVIDER_BRAND_ICONS, type ProviderId } from "@/lib/constants/providers.constants";
import { pxToRem } from "@/theme/scale";

interface BrandIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  slug: ProviderId;
  size?: number;
  color?: "currentColor" | "brand" | string;
  title?: string;
}

function BrandIcon({ slug, size = 16, color = "currentColor", title, ...rest }: BrandIconProps) {
  const icon = PROVIDER_BRAND_ICONS[slug];
  const fill = color === "brand" ? `#${icon.hex}` : color;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={pxToRem(size)}
      height={pxToRem(size)}
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

export default BrandIcon;
