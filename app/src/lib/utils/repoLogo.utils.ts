import { type LogoBlob, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";

// Module-level cache so two RepoAvatars rendering for the same repo don't
// each fire a separate `load_logo_bytes` invoke. Stores the in-flight
// Promise<string|null> so concurrent callers await the same fetch.
const cache = new Map<string, Promise<string | null>>();

export function loadRepoLogoUri(path: string): Promise<string | null> {
  const cached = cache.get(path);
  if (cached) return cached;
  if (!isTauri()) {
    const empty = Promise.resolve<string | null>(null);
    cache.set(path, empty);
    return empty;
  }
  const promise = invoke<LogoBlob>(TauriCommand.LOAD_LOGO_BYTES, { path })
    .then((blob) => `data:${blob.mimeType};base64,${blob.data}`)
    .catch(() => null);
  cache.set(path, promise);
  return promise;
}

/** Drop the data-URI cache for a given path so a fresh `load_logo_bytes`
 *  fires next time the avatar is rendered. Used after upload/clear: the
 *  file at `<app_data>/repo-logos/<repo_id>.<ext>` may have been replaced
 *  in place, and without busting we'd keep showing the previous bytes. */
export function invalidateRepoLogoCache(path: string | null | undefined): void {
  if (path) cache.delete(path);
}

export function pickLogoPath(
  logoPath: string | null,
  logoDarkPath: string | null,
  isDarkMode: boolean,
): string | null {
  if (isDarkMode && logoDarkPath) return logoDarkPath;
  return logoPath ?? logoDarkPath;
}
