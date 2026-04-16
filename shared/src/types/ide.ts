export type IdeId =
  | "vscode"
  | "vscode-insiders"
  | "cursor"
  | "webstorm"
  | "idea"
  | "jetbrains-toolbox";

export interface IdeDefinition {
  id: IdeId;
  name: string;
  command: string;
}

export interface IdeConfig {
  id: IdeId;
  available: boolean;
}
