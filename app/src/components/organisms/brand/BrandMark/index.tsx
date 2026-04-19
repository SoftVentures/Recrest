interface BrandMarkProps {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** Recrest chevron mark — two stacked V's. Inline SVG so it inherits
 * `currentColor` via the `stroke` prop and stays theme-aware. */
export function BrandMark({
  size = 20,
  stroke = "currentColor",
  strokeWidth = 52,
}: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      <g
        transform="translate(288, 352)"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      >
        <path d="M0 200 L224 0 L448 200" />
        <path d="M0 320 L224 120 L448 320" opacity="0.5" />
      </g>
    </svg>
  );
}
