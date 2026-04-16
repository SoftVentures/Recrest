import type { IdeDefinition, IdeId } from "../types/ide.js";

export const IDE_IDS = [
  "vscode",
  "vscode-insiders",
  "cursor",
  "webstorm",
  "idea",
  "jetbrains-toolbox",
] as const satisfies readonly IdeId[];

export const IDE_DEFINITIONS: Record<IdeId, IdeDefinition> = {
  vscode: { id: "vscode", name: "VS Code", command: "code" },
  "vscode-insiders": { id: "vscode-insiders", name: "VS Code Insiders", command: "code-insiders" },
  cursor: { id: "cursor", name: "Cursor", command: "cursor" },
  webstorm: { id: "webstorm", name: "WebStorm", command: "webstorm" },
  idea: { id: "idea", name: "IntelliJ IDEA", command: "idea" },
  "jetbrains-toolbox": {
    id: "jetbrains-toolbox",
    name: "JetBrains Toolbox",
    command: "jetbrains-toolbox",
  },
};
