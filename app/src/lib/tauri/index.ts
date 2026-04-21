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
 *
 * In dev builds, when the Developer tab's "IPC trace" flag is on, every call
 * is logged with its args + duration. The `import.meta.env.DEV` gate is
 * compile-time so this is zero-cost in production. Store is loaded via a
 * dynamic import so this module can be imported by slices without a cycle.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`tauri-ipc-unavailable: ${command} (running outside Tauri runtime)`);
  }
  if (import.meta.env.DEV) {
    let tracing = false;
    try {
      const { store } = await import("@/store");
      const s = store.getState() as unknown as { uiDevFlags?: { ipcTrace?: boolean } };
      tracing = s.uiDevFlags?.ipcTrace === true;
    } catch {
      /* store not yet ready or missing — fall through to untraced invoke */
    }
    if (tracing) {
      const t0 = performance.now();
      try {
        const result = await tauriInvoke<T>(command, args);
        console.debug("[ipc]", command, args, `${Math.round(performance.now() - t0)}ms`, result);
        return result;
      } catch (err) {
        console.debug(
          "[ipc]",
          command,
          args,
          `${Math.round(performance.now() - t0)}ms`,
          "ERROR",
          err,
        );
        throw err;
      }
    }
  }
  return tauriInvoke<T>(command, args);
}

/**
 * Swallows `tauri-ipc-unavailable` and any command-side failure, returning
 * `null`. Use for fire-and-forget calls (tray badge, window state persist)
 * where a failure should not propagate to UI code. Delegates to {@link invoke}
 * so the developer-tab IPC trace (`uiDevFlags.ipcTrace`) is inherited.
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    console.warn(`[tauri] invoke '${command}' failed:`, err);
    return null;
  }
}

export async function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }
  return tauriListen<T>(event, handler);
}

/**
 * Like `listen`, but never throws — returns a no-op unsubscribe if the
 * subscription itself fails (e.g. plugin not registered).
 */
export async function safeListen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  try {
    return await tauriListen<T>(event, handler);
  } catch (err) {
    console.warn(`[tauri] listen '${event}' failed:`, err);
    return () => {};
  }
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

/**
 * Returns the Tauri runtime version (e.g. "2.1.0"). Wraps the direct
 * `@tauri-apps/api/app` import so component code stays inside the
 * `@/lib/tauri` boundary. No-ops to `null` outside Tauri.
 */
export async function getTauriRuntimeVersion(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { getTauriVersion } = await import("@tauri-apps/api/app");
    return await getTauriVersion();
  } catch (err) {
    console.warn("[tauri] getTauriRuntimeVersion failed:", err);
    return null;
  }
}

/**
 * Reveal a path (file or directory) in the OS file browser, selecting the
 * item. Thin wrapper over `@tauri-apps/plugin-opener`'s `revealItemInDir` so
 * component code doesn't import the plugin directly. No-ops outside Tauri.
 */
export async function revealPathInSystem(path: string): Promise<void> {
  if (!isTauri() || !path) return;
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(path);
  } catch (err) {
    console.warn("[tauri] revealPathInSystem failed:", err);
  }
}

/**
 * Open the current webview's DevTools. There is no synchronous "is it open"
 * query in Tauri v2, so this always attempts to open — in debug builds
 * DevTools are already on anyway, and double-open is a no-op. No-ops outside
 * Tauri.
 */
export async function toggleWebviewDevtools(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    const webview = getCurrentWebview() as unknown as { openDevtools?: () => void };
    if (typeof webview.openDevtools === "function") {
      webview.openDevtools();
    }
  } catch (err) {
    console.warn("[tauri] toggleWebviewDevtools failed:", err);
  }
}
