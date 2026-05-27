/**
 * Module-level toggle for the developer IPC trace. Kept out of the Redux store
 * on purpose: `lib/tauri` must stay free of store imports (otherwise
 * `store → backendSync → lib/tauri → store` forms a dependency cycle). The
 * Developer tab writes the flag via {@link setIpcTrace}; `invoke` reads it via
 * {@link isIpcTraceEnabled}.
 */
let enabled = false;

export function setIpcTrace(value: boolean): void {
  enabled = value;
}

export function isIpcTraceEnabled(): boolean {
  return enabled;
}
