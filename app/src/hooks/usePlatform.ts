import { useEffect, useState } from "react";

import {
  PLATFORM_LABELS,
  PLATFORM_MODIFIER_LABELS,
  PLATFORM_WINDOW_CHROME,
  Platform,
  WindowChrome,
} from "@/lib/constants/platform.constants";
import { isTauri } from "@/lib/tauri";

export { Platform, type WindowChrome } from "@/lib/constants/platform.constants";

function detectFromUserAgent(): Platform {
  if (typeof navigator === "undefined") return Platform.WINDOWS;
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return Platform.MAC;
  if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return Platform.LINUX;
  return Platform.WINDOWS;
}

/** Platform detection. In Tauri we prefer the OS plugin (accurate even when
 *  the webview's UA is spoofed); on the web we fall back to the UA string. */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(detectFromUserAgent);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { platform: getPlatform } = await import("@tauri-apps/plugin-os");
        const p = await getPlatform();
        if (cancelled) return;
        if (p === "macos") setPlatform(Platform.MAC);
        else if (p === "windows") setPlatform(Platform.WINDOWS);
        else setPlatform(Platform.LINUX);
      } catch {
        /* Not in Tauri — the UA-based initial value is fine. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return platform;
}

/**
 * Maps platform + runtime to the chrome variant the UI should render.
 * In the pure-web dev mode the browser provides its own chrome — we return
 * `"none"` so the app mounts without a bespoke titlebar.
 */
export function useWindowChrome(): WindowChrome {
  const platform = usePlatform();
  // In the pure-web dev mode (`yarn dev:web`) the browser already paints
  // its own chrome — rendering ours on top would just steal vertical space
  // for no benefit. The dev stub installs `__TAURI_INTERNALS__` so the seed
  // IPC works, but tags itself with `__RECREST_DEV_STUB__`; we explicitly
  // check that here so only the real Tauri runtime triggers the bespoke
  // titlebar.
  const isRealTauri =
    isTauri() && !(typeof window !== "undefined" && "__RECREST_DEV_STUB__" in window);
  if (!isRealTauri) return WindowChrome.NONE;
  return PLATFORM_WINDOW_CHROME[platform];
}

/** Human-readable label for the active platform — used in About/Settings copy. */
export function platformLabel(p: Platform): string {
  return PLATFORM_LABELS[p];
}

/** Returns the user-facing text for a cross-platform modifier + key combo. */
export function formatShortcut(
  platform: Platform,
  keys: { mod?: boolean; shift?: boolean; alt?: boolean; key: string },
): string {
  const mods = PLATFORM_MODIFIER_LABELS[platform];
  const parts: string[] = [];
  if (keys.mod) parts.push(mods.mod);
  if (keys.shift) parts.push(mods.shift);
  if (keys.alt) parts.push(mods.alt);
  parts.push(keys.key);
  return parts.join(mods.joiner);
}
