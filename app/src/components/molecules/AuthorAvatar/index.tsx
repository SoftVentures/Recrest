import type { CSSProperties } from "react";

import { initialsFromName } from "@/lib/initials";

interface AuthorAvatarProps {
  name: string | null | undefined;
  size?: number;
  /** Optional image URL. When omitted we render coloured initials. */
  src?: string | null;
  className?: string;
}

/** Small round avatar — either the author's image, or their initials rendered
 *  over a deterministic gradient derived from the name. */
export function AuthorAvatar({ name, size = 24, src, className }: AuthorAvatarProps) {
  const label = initialsFromName(name) || "?";
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: gradientFor(name ?? ""),
    color: "#fff",
    fontSize: Math.max(9, Math.round(size * 0.4)),
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    letterSpacing: 0,
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className={className}
        style={style}
      />
    );
  }
  return (
    <span className={className} style={style} aria-label={name ?? "unknown"}>
      {label}
    </span>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg,#ff7a59,#d6336c)",
  "linear-gradient(135deg,#4f8cff,#7b2ff7)",
  "linear-gradient(135deg,#10b981,#0ea5a3)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#84cc16,#10b981)",
  "linear-gradient(135deg,#f97316,#eab308)",
];

function gradientFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length] ?? GRADIENTS[0]!;
}
