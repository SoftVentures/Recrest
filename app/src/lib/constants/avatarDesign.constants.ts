/**
 * Curated background + icon options for the repo avatar designer. The designer
 * renders an icon on one of these backgrounds and saves the result as an SVG
 * avatar (see `buildAvatarSvg`). Backgrounds carry two gradient stops; solids
 * simply repeat the same colour for both stops so the renderer stays uniform.
 */

export interface AvatarBackground {
  /** Stable id — persisted nowhere (the SVG is the source of truth) but used as
   *  the React key and the picker's `data-testid`. */
  id: string;
  /** Two-stop gradient (135deg). Solids repeat the same colour twice. */
  stops: readonly [string, string];
  /** True for two-distinct-colour gradients (kept separate from solids in the
   *  picker so the two rows read as "solid" vs "gradient"). */
  gradient: boolean;
}

export const AVATAR_BACKGROUNDS: readonly AvatarBackground[] = [
  // Solids — ordered around the hue wheel (red → violet → pink), neutral last.
  { id: "red", stops: ["#ef4444", "#ef4444"], gradient: false },
  { id: "amber", stops: ["#f59e0b", "#f59e0b"], gradient: false },
  { id: "emerald", stops: ["#10b981", "#10b981"], gradient: false },
  { id: "cyan", stops: ["#06b6d4", "#06b6d4"], gradient: false },
  { id: "blue", stops: ["#3b82f6", "#3b82f6"], gradient: false },
  { id: "indigo", stops: ["#6366f1", "#6366f1"], gradient: false },
  { id: "violet", stops: ["#8b5cf6", "#8b5cf6"], gradient: false },
  { id: "pink", stops: ["#ec4899", "#ec4899"], gradient: false },
  // Gradients — warm → cool spectrum sweep (two rows).
  { id: "ember", stops: ["#f59e0b", "#ef4444"], gradient: true },
  { id: "peach", stops: ["#fbbf24", "#fb7185"], gradient: true },
  { id: "sunset", stops: ["#ff7a59", "#d6336c"], gradient: true },
  { id: "rose", stops: ["#f43f5e", "#a855f7"], gradient: true },
  { id: "grape", stops: ["#a855f7", "#ec4899"], gradient: true },
  { id: "berry", stops: ["#be185d", "#7c3aed"], gradient: true },
  { id: "magenta", stops: ["#d946ef", "#6366f1"], gradient: true },
  { id: "royal", stops: ["#7c3aed", "#2563eb"], gradient: true },
  { id: "iris", stops: ["#6366f1", "#06b6d4"], gradient: true },
  { id: "sky", stops: ["#0ea5e9", "#6366f1"], gradient: true },
  { id: "ocean", stops: ["#06b6d4", "#3b82f6"], gradient: true },
  { id: "teal", stops: ["#14b8a6", "#0ea5e9"], gradient: true },
  { id: "aurora", stops: ["#10b981", "#0ea5e9"], gradient: true },
  { id: "forest", stops: ["#16a34a", "#65a30d"], gradient: true },
  { id: "lime", stops: ["#84cc16", "#10b981"], gradient: true },
  { id: "gold", stops: ["#f59e0b", "#84cc16"], gradient: true },
];

/** CSS `linear-gradient` for previewing a background (matches `buildAvatarSvg`'s
 *  135deg direction). Solids resolve to a flat fill since both stops match. */
export function avatarBackgroundCss(stops: readonly [string, string]): string {
  return `linear-gradient(135deg, ${stops[0]} 0%, ${stops[1]} 100%)`;
}
