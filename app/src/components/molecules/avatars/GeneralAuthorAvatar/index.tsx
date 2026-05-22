import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Author avatar — gradient tile keyed on a deterministic hash of the author
 * identifier (email if present, falling back to name). Same visual language
 * as `GeneralRepoAvatar` but the colour assignment is purely content-derived
 * so the same author always renders in the same colour across rerenders and
 * sessions (no per-session slot reuse).
 */
const AUTHOR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#4f8cff", "#7b2ff7"],
  ["#10b981", "#0ea5a3"],
  ["#ff7a59", "#d6336c"],
  ["#f59e0b", "#ef4444"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#22c55e", "#14b8a6"],
  ["#a855f7", "#ec4899"],
  ["#0ea5e9", "#14b8a6"],
  ["#7c3aed", "#2563eb"],
  ["#f97316", "#eab308"],
  ["#6366f1", "#06b6d4"],
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradientForAuthor(id: string): readonly [string, string] {
  const idx = hashCode(id.toLowerCase()) % AUTHOR_GRADIENTS.length;
  return AUTHOR_GRADIENTS[idx] ?? AUTHOR_GRADIENTS[0]!;
}

interface TileProps {
  size: number;
  gradient: string;
}

const Tile = styled(Box, {
  shouldForwardProp: (p) => p !== "size" && p !== "gradient",
})<TileProps>(({ size, gradient }) => ({
  width: size,
  height: size,
  borderRadius: "50%",
  background: gradient,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: Math.round(size * 0.42),
  fontWeight: 700,
  letterSpacing: "-0.02em",
  flexShrink: 0,
  fontFamily: "Inter, -apple-system, sans-serif",
  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
}));

interface Props {
  name: string;
  email?: string;
  size?: number;
}

function GeneralAuthorAvatar({ name, email, size = 24 }: Props) {
  const id = (email || name).trim();
  const [c1, c2] = gradientForAuthor(id);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <Tile size={size} gradient={gradient} aria-label={name}>
      {letter}
    </Tile>
  );
}

export default GeneralAuthorAvatar;
