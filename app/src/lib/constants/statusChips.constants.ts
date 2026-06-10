import { REPO_STATUS_CHIPS, type RepoStatusChip } from "@recrest/shared";

export { REPO_STATUS_CHIPS, type RepoStatusChip };

/** Visual metadata per status chip. `iconName` is a slug the renderer
 *  resolves to a Lucide icon — the constants file deliberately does NOT
 *  import React components, so it can be loaded from tests without
 *  pulling in `lucide-react`. */
export type StatusChipIcon =
  | "circle-dashed"
  | "check-circle-2"
  | "arrow-up-from-line"
  | "arrow-down-from-line";

export interface RepoStatusChipUi {
  iconName: StatusChipIcon;
  /** Tone slug pushed onto `data-state` for CSS variants. */
  tone: "warn" | "ok" | "info";
  labelKey: `repos.chip.${RepoStatusChip}`;
}

export const REPO_STATUS_CHIP_UI = {
  dirty: { iconName: "circle-dashed", tone: "warn", labelKey: "repos.chip.dirty" },
  clean: { iconName: "check-circle-2", tone: "ok", labelKey: "repos.chip.clean" },
  ahead: { iconName: "arrow-up-from-line", tone: "info", labelKey: "repos.chip.ahead" },
  behind: { iconName: "arrow-down-from-line", tone: "info", labelKey: "repos.chip.behind" },
} as const satisfies Record<RepoStatusChip, RepoStatusChipUi>;
