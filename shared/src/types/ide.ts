/** Desktop OS targets the launcher / installer / detection code branches on.
 *  Mirrors the values returned by Tauri's `@tauri-apps/plugin-os::platform()`
 *  so the two stay in lockstep across the IPC boundary. */
export type Platform = "macos" | "linux" | "windows";

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
