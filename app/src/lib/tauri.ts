import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { type EventCallback, type UnlistenFn, listen as tauriListen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * True when the page is running inside a Tauri webview. When false (plain
 * `vite dev` in a browser) the IPC bridge is unavailable and calls would
 * throw; we no-op instead so UI work can proceed outside the desktop shell.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Typed wrapper around `invoke`. Outside Tauri it rejects with a typed error
 * so callers see a predictable failure instead of a cryptic TypeError.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`tauri-ipc-unavailable: ${command} (running outside Tauri runtime)`);
  }
  return tauriInvoke<T>(command, args);
}

export async function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (!isTauri()) {
    // Return a no-op unsubscribe so effects can still clean up cleanly.
    return () => {};
  }
  return tauriListen<T>(event, handler);
}

/**
 * Open an external URL. In Tauri the opener plugin routes it through the OS
 * default handler; in plain browser dev we fall back to `window.open`.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
