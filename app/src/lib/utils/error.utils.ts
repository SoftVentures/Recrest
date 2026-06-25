/**
 * Extract a human-readable message from an unknown thrown value.
 *
 * The Tauri IPC layer rejects with a serialized `CommandError` (`{ kind,
 * message }`) and Redux Toolkit's `.unwrap()` rejects with a `SerializedError`
 * (`{ message, ... }`) — neither is an `Error` instance, so the common
 * `err instanceof Error ? err.message : String(err)` pattern stringifies them
 * to the useless `"[object Object]"`. This helper reads the `message` field off
 * any object that carries one, falling back to the native cases.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return String(err);
}
