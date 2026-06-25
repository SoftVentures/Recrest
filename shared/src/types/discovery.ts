/**
 * Unified DTO returned by the Rust backend's `list_terminals` / `list_ides`
 * commands. Mirrors `DiscoveredApp` in `app/src-tauri/src/discovery/mod.rs` —
 * keep the two in lockstep when adding fields.
 *
 * Each app is discovered by platform-native introspection (macOS bundle scan,
 * Windows registry `App Paths`, Linux `.desktop` files) rather than PATH
 * probing, so the result reflects what's actually installed on the system.
 */
export interface DiscoveredApp {
  kind: AppKind;
  /** Stable id — for known apps this aligns with `TerminalId` / `IdeId` from
   *  `@recrest/shared` so settings persistence stays valid. New apps not yet
   *  in the shared id union are still surfaced. */
  id: string;
  displayName: string;
  iconPath: string | null;
  launchCommand: LaunchSpec;
}

export type AppKind = "terminal" | "ide";

export type LaunchSpec = AppBundleLaunch | ExecutableLaunch | DesktopEntryLaunch;

/** macOS — launch via `open -a <BundleName>` or `open -b <BundleId>`. */
export interface AppBundleLaunch {
  kind: "appBundle";
  bundlePath: string;
}

/** Windows / generic — direct exec of a binary on disk. */
export interface ExecutableLaunch {
  kind: "executable";
  binary: string;
  args: string[];
}

/** Linux — launch via the resolved `Exec=` line from the `.desktop` entry. */
export interface DesktopEntryLaunch {
  kind: "desktopEntry";
  exec: string;
}
