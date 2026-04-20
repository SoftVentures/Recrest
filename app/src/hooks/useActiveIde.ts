import { useMemo } from "react";

import { IDE_DEFINITIONS, IDE_IDS, type IdeId } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

export interface ActiveIde {
  id: IdeId;
  name: string;
}

/**
 * Which IDE would the app actually launch when "Open in IDE" is clicked?
 * Mirrors the Rust-side logic in `ide::open_repo`: a user override via
 * `settings.defaultIde` wins; otherwise we fall back to the first IDE in the
 * priority list (`IDE_IDS`) that was detected on the system.
 *
 * Every UI surface that shows "Open in IDE" (detail drawer, full-screen
 * header, RepoRow action) reads this hook so label + icon stay consistent
 * and react to settings changes immediately.
 */
export function useActiveIde(): ActiveIde | null {
  const defaultIde = useAppSelector((s) => s.settings.defaultIde);
  const detectedIdes = useAppSelector((s) => s.settings.detectedIdes);

  return useMemo<ActiveIde | null>(() => {
    if (defaultIde && (IDE_IDS as readonly string[]).includes(defaultIde)) {
      const id = defaultIde as IdeId;
      return { id, name: IDE_DEFINITIONS[id].name };
    }
    const detected = detectedIdes ?? [];
    const first = IDE_IDS.find((id) => detected.includes(id));
    if (!first) return null;
    return { id: first, name: IDE_DEFINITIONS[first].name };
  }, [defaultIde, detectedIdes]);
}
