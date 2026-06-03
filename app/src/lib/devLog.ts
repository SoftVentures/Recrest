/**
 * Dev-mode log forwarder.
 *
 * Tauri's WebView2 console is only visible via F12 in the running window —
 * not to anything outside the process. This module mirrors `console.log/info/
 * warn/error`, `window.onerror`, and `unhandledrejection` into the Rust
 * `dev_log` command, which appends each line to `<repo_root>/.claude-dev.log`
 * and also re-emits via `tracing` so the lines surface in `yarn dev` stdout.
 *
 * Effect: an external supervisor (e.g. Claude reading the file directly) can
 * see what the frontend is doing without anyone keeping DevTools open.
 *
 * Production safety: the whole module is gated by `import.meta.env.DEV` at
 * the call site (`main.tsx`). Vite tree-shakes the import in production.
 * Even if a release build *did* import it, the Rust `dev_log` command is
 * `#[cfg(debug_assertions)]` and not registered, so invokes would fail and
 * the safe-swallow path kicks in — no behaviour change for users.
 */
import { TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { setIpcTrace } from "@/lib/tauri/ipcTrace";

type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

let installed = false;

/** Best-effort JSON serialisation that survives circular refs, functions,
 *  Error objects, and DOM nodes — enough to capture *intent* for log lines. */
function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ""}`.trim();
  }
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, v: unknown) => {
        if (typeof v === "bigint") return v.toString();
        if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`;
        if (v && typeof v === "object") {
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
        }
        return v;
      },
      2,
    );
  } catch {
    try {
      return String(value);
    } catch {
      return "[unserialisable]";
    }
  }
}

function joinArgs(args: unknown[]): string {
  return args.map(safeStringify).join(" ");
}

/**
 * Forward a single log line to the Rust sink. The function deliberately
 * does not go through the project's `invoke()` wrapper for two reasons:
 * 1. It must never log itself (would loop the patched console).
 * 2. It must silently swallow `command not found` so the patched console
 *    still works in a half-built dev shell where `dev_log` isn't
 *    registered yet (e.g. the running binary predates the rebuild).
 */
async function forward(level: ConsoleLevel, args: unknown[]): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke(TauriCommand.DEV_LOG, {
      level,
      message: joinArgs(args),
      context: null,
    });
  } catch {
    // Swallow — see docblock.
  }
}

/** Installs the forwarders. Safe to call multiple times; second call is a
 *  no-op. Returns nothing — the forwarders run for the page lifetime. */
export function installDevLogForwarder(): void {
  if (installed) return;
  installed = true;

  const original: Record<ConsoleLevel, (...args: unknown[]) => void> = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  const wrap = (level: ConsoleLevel) =>
    function patched(...args: unknown[]): void {
      void forward(level, args);
      original[level](...args);
    };

  console.log = wrap("log");
  console.info = wrap("info");
  console.warn = wrap("warn");
  console.error = wrap("error");
  console.debug = wrap("debug");

  // Surface runtime exceptions that never went through `console.error`
  // (e.g. handler bugs in plain event listeners, sync throws in effects).
  window.addEventListener("error", (e) => {
    void forward("error", [
      `window.onerror: ${e.message}`,
      `at ${e.filename}:${e.lineno}:${e.colno}`,
      e.error instanceof Error ? (e.error.stack ?? "") : "",
    ]);
  });

  // React 18+ swallows render-time errors by default — they flow through
  // error boundaries. Unhandled async rejections still bubble to this
  // listener and are the most common silent-failure mode in IPC paths.
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as unknown;
    void forward("error", [
      "unhandledrejection",
      reason instanceof Error
        ? `${reason.name}: ${reason.message}\n${reason.stack ?? ""}`
        : safeStringify(reason),
    ]);
  });

  // Force IPC trace on whenever the forwarder runs. The flag also gates
  // a `console.debug("[ipc]", …)` call inside `invoke()` — with the
  // forwarder in place, that call hits our `dev_log` sink, so every
  // `invoke()` (command + args + duration + result/error) lands in
  // `.claude-dev.log`. That's the difference between "the user clicked
  // *something*" and "the user invoked `scan_repos` with paths=[…] and
  // it returned []".
  setIpcTrace(true);

  // Initial marker so the file shows when the SPA finished hydrating.
  void forward("info", [
    `[devLog] forwarder installed at ${new Date().toISOString()} (ipc-trace=on)`,
  ]);
}
