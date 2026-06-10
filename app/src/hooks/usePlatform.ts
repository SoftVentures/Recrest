import { useEffect, useMemo, useState } from "react";

import {
  DEMO_CHROME_QUERY_PARAM,
  DEMO_CHROME_VALUES,
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
 * True only under the real Tauri desktop runtime — not the `yarn dev:web`
 * stub. The dev stub installs `__TAURI_INTERNALS__` so the seed IPC works,
 * but tags itself with `__RECREST_DEV_STUB__`; we check that here so only the
 * real desktop shell triggers OS-owned behaviour (native traffic-lights,
 * window controls, …).
 */
export function isRealTauri(): boolean {
  return isTauri() && !(typeof window !== "undefined" && "__RECREST_DEV_STUB__" in window);
}

/** Reads the `?demoChrome=` override (see `DEMO_CHROME_QUERY_PARAM`). */
function demoChromeOverride(): WindowChrome | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(DEMO_CHROME_QUERY_PARAM);
  return (value && DEMO_CHROME_VALUES[value]) || null;
}

/**
 * Maps platform + runtime to the chrome variant the UI should render.
 * In the pure-web dev mode the browser provides its own chrome — we return
 * `"none"` so the app mounts without a bespoke titlebar, unless the
 * `?demoChrome=` override forces a variant for screenshots/demos.
 */
export function useWindowChrome(): WindowChrome {
  const platform = usePlatform();
  const override = useMemo(() => demoChromeOverride(), []);
  if (override) return override;
  if (!isRealTauri()) return WindowChrome.NONE;
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
