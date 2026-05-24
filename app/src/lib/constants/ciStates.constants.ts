import { CI_STATES, type CiStatus } from "@recrest/shared";

export { CI_STATES, type CiStatus };

/** Visual tone applied to CI dots. Maps several backend states onto a
 *  smaller UI palette (pending + running collapse to the same amber dot;
 *  none → muted idle). The string flows into the `data-state` attribute
 *  consumed by the `CiDot` styled-component. */
export type CiTone = "passing" | "failing" | "running" | "idle";

export interface CiStateUi {
  tone: CiTone;
  labelKey: `ci.${CiStatus}`;
}

export const CI_STATE_UI = {
  success: { tone: "passing", labelKey: "ci.success" },
  failure: { tone: "failing", labelKey: "ci.failure" },
  running: { tone: "running", labelKey: "ci.running" },
  pending: { tone: "running", labelKey: "ci.pending" },
  none: { tone: "idle", labelKey: "ci.none" },
} as const satisfies Record<CiStatus, CiStateUi>;

/** Backwards-compatible reducer matching the legacy `ciFor()` helper that
 *  lived inline in `MrRow.tsx` / `MrDetailPanel.tsx`. Returns `null` for
 *  states that should not render a pill (`none` / unknown). */
export function ciFor(status: CiStatus | string | null | undefined): CiTone | null {
  if (status == null) return null;
  const entry = CI_STATE_UI[status as CiStatus];
  if (!entry || entry.tone === "idle") return null;
  return entry.tone;
}
