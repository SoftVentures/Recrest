import { PR_STATES, type PrState } from "@recrest/shared";

export { PR_STATES, type PrState };

/** Visual tone applied to PR state pills. The string value matches the
 *  `data-state` attribute consumed by the styled-component selectors. */
export type PrStateTone = "open" | "closed" | "merged";

export interface PrStateUi {
  /** Tone slug pushed onto `data-state` for CSS variants. */
  tone: PrStateTone;
  /** i18n key for the pill label (namespace `prs`). */
  labelKey: `prs.state.${PrState}`;
}

export const PR_STATE_UI = {
  open: { tone: "open", labelKey: "prs.state.open" },
  closed: { tone: "closed", labelKey: "prs.state.closed" },
  merged: { tone: "merged", labelKey: "prs.state.merged" },
} as const satisfies Record<PrState, PrStateUi>;
