import { IDE_DEFINITIONS, IDE_IDS, type IdeDefinition, type IdeId } from "@recrest/shared";

export { IDE_DEFINITIONS, IDE_IDS, type IdeDefinition, type IdeId };

/** UI-side IDE metadata: which logo slot to render and what extra CSS
 *  filter to apply. The actual SVG components live next to `IdeIcon` —
 *  this table only carries the slug + filter, so consumers can stay
 *  declarative and `IdeIcon` keeps owning the SVG imports. */
export type IdeLogoSlug = "vscode" | "cursor" | "webstorm" | "intellij" | "jetbrains-toolbox";

export interface IdeUi {
  /** Logo bucket the renderer should look up. `vscode` is shared between
   *  VS Code and VS Code Insiders — the renderer applies `filterHue` to
   *  differentiate. `cursor` is rendered via `simple-icons` inline. */
  logo: IdeLogoSlug;
  /** Hue-rotate degrees to apply on top of the base logo. `null` means
   *  render the logo unmodified. */
  filterHue: number | null;
}

export const IDE_UI = {
  vscode: { logo: "vscode", filterHue: null },
  "vscode-insiders": { logo: "vscode", filterHue: 140 },
  cursor: { logo: "cursor", filterHue: null },
  webstorm: { logo: "webstorm", filterHue: null },
  idea: { logo: "intellij", filterHue: null },
  "jetbrains-toolbox": { logo: "jetbrains-toolbox", filterHue: null },
} as const satisfies Record<IdeId, IdeUi>;
