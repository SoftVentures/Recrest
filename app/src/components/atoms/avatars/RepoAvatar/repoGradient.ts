import { hashCode } from "@/lib/utils/hash.utils";

/**
 * Curated two-stop gradients for repo fallback avatars (when a repo has no
 * uploaded/auto-detected logo). Stops are assigned by a stable content hash of
 * the repo id so the colour never shuffles between renders or sessions.
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

/** Stable fallback gradient stops for a repo id. Hash-derived (not render-order
 *  derived) so the same id always resolves to the same gradient across renders
 *  and sessions — and so callers like the avatar designer can recompute the
 *  exact background a repo currently shows to preselect it. */
export function repoGradientStops(id: string): readonly [string, string] {
  const idx = hashCode(id) % REPO_GRADIENTS.length;
  return REPO_GRADIENTS[idx] ?? REPO_GRADIENTS[0]!;
}
