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

/** Native single-font picker — limits the dialog to the formats the custom
 *  font upload accepts. Mirrors `ALLOWED_FONT_EXTENSIONS` in
 *  `commands/fonts.rs`. */
export async function pickFontFile(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      directory: false,
      multiple: false,
      defaultPath: defaultPath || undefined,
      filters: [
        {
          name: "Font",
          extensions: ["ttf", "otf", "woff2", "woff"],
        },
      ],
    });
    return typeof picked === "string" ? picked : null;
  } catch {
    return null;
  }
}

/** Native single-image picker — limits the dialog to the formats the repo
 *  avatar upload accepts. Mirrors `UPLOAD_EXTENSIONS` in
 *  `commands/repos.rs::set_repo_logo`. */
export async function pickImageFile(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      directory: false,
      multiple: false,
      defaultPath: defaultPath || undefined,
      filters: [
        {
          name: "Image",
          extensions: ["svg", "png", "webp", "jpg", "jpeg", "gif"],
        },
      ],
    });
    return typeof picked === "string" ? picked : null;
  } catch {
    return null;
  }
}
