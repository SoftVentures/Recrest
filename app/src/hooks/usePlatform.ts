import { useEffect, useState } from "react";

export type Platform = "mac" | "windows" | "linux";

function detectFromUserAgent(): Platform {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return "mac";
  if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "linux";
  return "windows";
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
        if (p === "macos") setPlatform("mac");
        else if (p === "windows") setPlatform("windows");
        else setPlatform("linux");
      } catch {
        // Not in Tauri — the UA-based initial value is fine.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return platform;
}

/** Returns the user-facing text for a cross-platform modifier + key combo. */
export function formatShortcut(
  platform: Platform,
  keys: { mod?: boolean; shift?: boolean; alt?: boolean; key: string },
): string {
  const parts: string[] = [];
  if (keys.mod) parts.push(platform === "mac" ? "⌘" : "Ctrl");
  if (keys.shift) parts.push(platform === "mac" ? "⇧" : "Shift");
  if (keys.alt) parts.push(platform === "mac" ? "⌥" : "Alt");
  parts.push(keys.key);
  // Mac traditionally uses "+", Win/Linux use "+" too but with spaces.
  return platform === "mac" ? parts.join("") : parts.join("+");
}
