/**
 * Re-export of the canonical event-channel constants from `@recrest/shared`.
 *
 * `@recrest/shared/constants/events.ts` is the source of truth — both the
 * frontend and the Playwright tests consume it directly. This module exists
 * so app-side code can import via the ergonomic `@/lib/constants/events`
 * alias and so any app-only event channels (renderer-internal CustomEvents)
 * have a clear home.
 *
 * Backend mirror lives at `app/src-tauri/src/git/watcher.rs::REPO_STATUS_EVENT`
 * and `app/src-tauri/src/commands/settings.rs::SETTINGS_RESET_EVENT`. The
 * string values are duplicated there; keep them in sync if you ever rename
 * a channel.
 */
export {
  CLONE_PROGRESS_EVENT,
  EventChannel,
  type EventChannelName,
  OAUTH_CALLBACK_EVENT,
  REPO_STATUS_EVENT,
  SETTINGS_RESET_EVENT,
  UPDATER_AVAILABLE_EVENT,
  UPDATER_PROGRESS_EVENT,
  WindowEvent,
  type WindowEventName,
} from "@recrest/shared";
