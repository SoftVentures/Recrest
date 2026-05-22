import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Curated two-stop gradients. Each repo gets a stable slot so colours don't
 * shuffle between renders within a session. Mirrors src-old `RepoAvatar`'s
 * palette so existing screenshots are pixel-comparable.
 */
const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#ff7a59", "#d6336c"],
  ["#4f8cff", "#7b2ff7"],
  ["#10b981", "#0ea5a3"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#8b5cf6"],
  ["#06b6d4", "#3b82f6"],
  ["#22c55e", "#14b8a6"],
  ["#f97316", "#eab308"],
  ["#a855f7", "#ec4899"],
  ["#0ea5e9", "#14b8a6"],
  ["#e11d48", "#f97316"],
  ["#6366f1", "#06b6d4"],
  ["#84cc16", "#10b981"],
  ["#d946ef", "#6366f1"],
  ["#f43f5e", "#a855f7"],
  ["#059669", "#0284c7"],
  ["#fb7185", "#fbbf24"],
  ["#7c3aed", "#2563eb"],
  ["#16a34a", "#65a30d"],
  ["#be185d", "#4c1d95"],
  ["#0891b2", "#4338ca"],
  ["#ea580c", "#b91c1c"],
  ["#15803d", "#0d9488"],
  ["#9333ea", "#db2777"],
];

const ASSIGNMENTS = new Map<string, number>();
let nextSlot = 0;

function gradientFor(id: string): readonly [string, string] {
  let slot = ASSIGNMENTS.get(id);
  if (slot == null) {
    slot = nextSlot++;
    ASSIGNMENTS.set(id, slot);
  }
  const idx = slot % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] ?? AVATAR_GRADIENTS[0]!;
}

interface TileProps {
  size: number;
  radius: number;
  gradient: string;
}

const Tile = styled(Box, {
  shouldForwardProp: (p) => p !== "size" && p !== "radius" && p !== "gradient",
})<TileProps>(({ size, radius, gradient }) => ({
  width: size,
  height: size,
  borderRadius: radius,
  background: gradient,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: Math.round(size * 0.5),
  fontWeight: 700,
  letterSpacing: "-0.02em",
  flexShrink: 0,
  fontFamily: "Inter, -apple-system, sans-serif",
  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
}));

interface RepoLike {
  id: string;
  name: string;
}

interface Props {
  repo: RepoLike;
  size?: number;
  radius?: number;
}

function GeneralRepoAvatar({ repo, size = 24, radius = 6 }: Props) {
  const [c1, c2] = gradientFor(repo.id || repo.name);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const cleaned = repo.name.replace(/^[\W_]+/, "") || repo.name;
  const letter = cleaned.charAt(0).toUpperCase();

  return (
    <Tile size={size} radius={radius} gradient={gradient} aria-label={repo.name}>
      {letter}
    </Tile>
  );
}

export default GeneralRepoAvatar;
