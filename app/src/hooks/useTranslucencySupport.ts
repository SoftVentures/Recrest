import { useEffect, useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { safeInvoke } from "@/lib/tauri";

/**
 * Whether the host platform can render the orthogonal translucency effect
 * (macOS NSVisualEffect / Liquid Glass). The backend command
 * `supports_translucency` returns the static capability; we cache it once on
 * mount.
 *
 * Defaults to `true` until the probe resolves so the settings UI doesn't
 * flicker the controls in/out on first paint. Outside Tauri (`yarn dev:web`,
 * tests) `safeInvoke` returns `null` and we stay at the optimistic default;
 * the renderer-only translucency state still persists and re-applies cleanly
 * when the user next launches under Tauri.
 */
export function useTranslucencySupport(): boolean {
  const [supports, setSupports] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void safeInvoke<boolean | null>(TauriCommand.SUPPORTS_TRANSLUCENCY).then((result) => {
      if (cancelled) return;
      if (typeof result === "boolean") setSupports(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return supports;
}
