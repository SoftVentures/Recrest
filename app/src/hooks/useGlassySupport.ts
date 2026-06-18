import { useEffect, useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { safeInvoke } from "@/lib/tauri";

/**
 * Whether the host platform can render the `glassy` theme's window vibrancy
 * effect (macOS NSVisualEffect, Windows acrylic). The backend command
 * `supports_glassy` returns the static capability; we cache it once on mount.
 *
 * Defaults to `true` until the probe resolves so the theme picker doesn't
 * flicker the option in/out on first paint. Outside Tauri (`yarn dev:web`,
 * tests) `safeInvoke` returns `null` and we stay at the optimistic default —
 * the demo build keeps Glassy visible because the renderer-only theme still
 * paints sensibly without OS vibrancy.
 */
export function useGlassySupport(): boolean {
  const [supports, setSupports] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void safeInvoke<boolean | null>(TauriCommand.SUPPORTS_GLASSY).then((result) => {
      if (cancelled) return;
      if (typeof result === "boolean") setSupports(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return supports;
}
