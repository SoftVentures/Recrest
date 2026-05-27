import { isTauri } from "@/lib/tauri";

/** Opens the native folder picker via `@tauri-apps/plugin-dialog`. Returns the
 *  chosen absolute path or `null` when the user cancels or the picker is
 *  unavailable (e.g. `yarn dev:web` running outside Tauri). The plugin import
 *  is dynamic so the browser build doesn't drag in the Tauri runtime. */
export async function pickFolder(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      directory: true,
      multiple: false,
      defaultPath: defaultPath || undefined,
    });
    return typeof picked === "string" ? picked : null;
  } catch {
    return null;
  }
}

/** Native single-file picker (counterpart to {@link pickFolder}). Returns the
 *  chosen absolute path or `null` when cancelled / outside Tauri. */
export async function pickFile(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      directory: false,
      multiple: false,
      defaultPath: defaultPath || undefined,
    });
    return typeof picked === "string" ? picked : null;
  } catch {
    return null;
  }
}
