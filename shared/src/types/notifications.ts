/** Kinds of events that trigger desktop notifications. Mirrors the
 *  `NotificationKind` enum on the Rust side (see `commands/notifications.rs`).
 *  `generic` covers one-off user-driven events (clone finished, update
 *  available) that are only gated by the master toggle. */
export type NotificationKind = "new_pr" | "ci_failed" | "merge_ready" | "generic";

/** Payload passed to the `notify` Tauri command. Titles and bodies are
 *  pre-translated on the TS side so Rust stays locale-agnostic. `url` is
 *  carried through for future click-to-open wiring (see Rust notify cmd). */
export interface NotifyPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  url?: string | null;
}
