/**
 * Tauri event channel names — the string passed to `listen()` on the frontend
 * and to `Emitter::emit()` on the Rust side. Must stay in sync with the
 * emitters in `app/src-tauri/src/`.
 *
 * `REPO_STATUS_EVENT` is defined in `constants/git.ts` (historical home) and
 * re-exported through `EventChannel` below for consistency.
 */
import { REPO_STATUS_EVENT } from "./git.js";

/** Emitted once at startup when the updater plugin finds a newer release. */
export const UPDATER_AVAILABLE_EVENT = "updater://available";

/** Emitted periodically while the signed plugin path downloads the installer.
 *  Payload: `{ chunk: number, total: number | null }`. */
export const UPDATER_PROGRESS_EVENT = "updater://progress";

/** Re-emitted from the Tauri deep-link listener when the OS hands us an
 *  `recrest://oauth/callback?...` URL. The renderer parses the URL and
 *  completes the exchange via `complete_oauth`. */
export const OAUTH_CALLBACK_EVENT = "oauth://callback";

/** Progress updates from `clone_remote_repositories_bulk`. Payload includes
 *  which repo is currently cloning + overall counts. */
export const CLONE_PROGRESS_EVENT = "clone://progress";

/** Emitted from `factory_reset` once the on-disk settings have been wiped and
 *  every keychain token cleared. The renderer listens for this to clear its
 *  own `localStorage`/`sessionStorage` and remount the onboarding wizard. */
export const SETTINGS_RESET_EVENT = "settings://reset";

/** Streamed commit batches for a `list_commits` request (Plan 04/01).
 *  Payload: `CommitsChunkPayload`. */
export const ACTIVITY_COMMITS_CHUNK_EVENT = "activity://commits-chunk";

/** Renderer notification that the Tauri window regained focus. Emitted from
 *  `on_window_event(Focused(true))`. Used to warm WebKit's backdrop-filter
 *  compositor before the user-visible paint, so Stage Manager swap-in /
 *  Cmd-Tab focus regain doesn't show a "transparent → shadow → blur"
 *  staged sequence. */
export const WINDOW_FOCUSED_EVENT = "recrest://window-focused";

/** Inverse of `WINDOW_FOCUSED_EVENT` — fires on `Focused(false)` so the
 *  renderer can run the same compositor probe BEFORE the OS captures the
 *  window's snapshot used for Stage Manager / Mission Control thumbnails. */
export const WINDOW_BLURRED_EVENT = "recrest://window-blurred";

export const EventChannel = {
  REPO_STATUS: REPO_STATUS_EVENT,
  UPDATER_AVAILABLE: UPDATER_AVAILABLE_EVENT,
  UPDATER_PROGRESS: UPDATER_PROGRESS_EVENT,
  OAUTH_CALLBACK: OAUTH_CALLBACK_EVENT,
  CLONE_PROGRESS: CLONE_PROGRESS_EVENT,
  SETTINGS_RESET: SETTINGS_RESET_EVENT,
  ACTIVITY_COMMITS_CHUNK: ACTIVITY_COMMITS_CHUNK_EVENT,
  WINDOW_FOCUSED: WINDOW_FOCUSED_EVENT,
  WINDOW_BLURRED: WINDOW_BLURRED_EVENT,
} as const;

export type EventChannelName = (typeof EventChannel)[keyof typeof EventChannel];

/**
 * Window `CustomEvent` names dispatched inside the renderer (not IPC).
 * Used to decouple global shortcut handlers from individual page components.
 */
export const WindowEvent = {
  PULL_CURRENT: "recrest:pull-current",
  OPEN_EDITOR: "recrest:open-editor",
  OPEN_TERMINAL: "recrest:open-terminal",
  TOGGLE_DETAIL: "recrest:toggle-detail",
  LOGO_UPDATED: "recrest:logo-updated",
} as const;

export type WindowEventName = (typeof WindowEvent)[keyof typeof WindowEvent];
