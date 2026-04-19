import type { SVGProps } from "react";

type SimpleIconData = { title: string; path: string };

type Props = {
  icon: SimpleIconData;
  size?: number;
} & Omit<SVGProps<SVGSVGElement>, "fill" | "viewBox">;

export function SimpleIcon({ icon, size = 16, "aria-label": ariaLabel, ...rest }: Props) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? icon.title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      {...rest}
    >
      <path d={icon.path} />
    </svg>
  );
}
