/**
 * Updater DTOs shared between the Rust backend and the React frontend.
 *
 * The backend emits `updater://available` (payload = `UpdaterAvailableEvent`)
 * and `updater://progress` (payload = `UpdaterProgressEvent`) events.
 * `AutoUpdateMode` lives in `./settings.js` — re-exported here so callers
 * that only care about the updater don't need to pull in the full settings
 * type surface.
 */

export type { AutoUpdateMode } from "./settings.js";

export interface UpdaterAvailableEvent {
  /** The version the backend considers "latest". */
  version: string;
  /** The currently installed app version at the time of the check. */
  currentVersion: string;
  /** Release notes. `null` when the backend had nothing to share. */
  body: string | null;
  /**
   * `true` when the signed Tauri updater plugin path can install the update
   * in-place. `false` means fallback — the UI should surface `downloadUrl`.
   */
  canAutoInstall: boolean;
  /**
   * Direct platform-asset URL for the GitHub Releases fallback. `null` on
   * the plugin path (the installer is downloaded by the plugin itself).
   */
  downloadUrl: string | null;
}

export interface UpdaterProgressEvent {
  /** Bytes received since the last progress event. */
  chunk: number;
  /** Total bytes expected. `null` when the server didn't send a length. */
  total: number | null;
}
