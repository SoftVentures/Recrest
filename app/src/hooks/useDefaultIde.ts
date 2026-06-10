import { IDE_DEFINITIONS, type IdeId } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

export interface DefaultIde {
  /** IdeId to render an icon for. Falls back to `vscode` when on auto so the
   *  button still has a glyph. */
  iconId: IdeId;
  /** Display name when an IDE is explicitly selected; `null` on auto (let the
   *  caller use a generic "Open in IDE" label). */
  name: string | null;
}

/**
 * Resolves the user's chosen default IDE from persisted settings so every
 * "Open in IDE" affordance reflects it (icon + label). `null`/auto means the
 * backend auto-detects at click time, so the UI shows a generic label.
 */
export function useDefaultIde(): DefaultIde {
  const selected = useAppSelector((s) => s.settings.backend?.defaultIde) ?? null;
  if (selected && selected in IDE_DEFINITIONS) {
    const id = selected as IdeId;
    return { iconId: id, name: IDE_DEFINITIONS[id].name };
  }
  return { iconId: "vscode", name: null };
}
