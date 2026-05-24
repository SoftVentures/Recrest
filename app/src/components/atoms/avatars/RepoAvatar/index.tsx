import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";

/**
 * Curated two-stop gradients. Each repo gets a stable slot so colours don't
 * shuffle between renders within a session.
 */
const REPO_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
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
  const idx = slot % REPO_GRADIENTS.length;
  return REPO_GRADIENTS[idx] ?? REPO_GRADIENTS[0]!;
}

interface RepoLike {
  id: string;
  name: string;
}

interface Props {
  repo: RepoLike;
  size?: number;
  radius?: number;
}

function RepoAvatar({ repo, size = 24, radius = 6 }: Props) {
  const [c1, c2] = gradientFor(repo.id || repo.name);
  const gradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  const cleaned = repo.name.replace(/^[\W_]+/, "") || repo.name;
  const letter = cleaned.charAt(0).toUpperCase();
  return (
    <GeneralAvatar
      size={size}
      radius={radius}
      gradient={gradient}
      letter={letter}
      label={repo.name}
    />
  );
}

export default RepoAvatar;
