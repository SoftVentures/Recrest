import { useEffect } from "react";

import { StorageKey } from "@/lib/constants/storage.constants";
import { THEME_ATTRIBUTE, THEME_ID_ATTRIBUTE, ThemeId } from "@/lib/constants/theme.constants";
import { useAppSelector } from "@/store/hooks";

/**
 * Mirrors the active theme onto `<html data-theme="…">` so any non-MUI CSS
 * + the E2E theme spec can detect the active mode. The attribute value is
 * the high-level mode ("light" / "dark") — the granular themeId rides on
 * `data-theme-id` for selectors that need to distinguish variants.
 *
 * Also mirrors the resolved theme into `localStorage` so the anti-flash
 * inline script in `index.html` can paint the correct background on the
 * very first frame after a reload. Backend remains the source of truth;
 * `localStorage` is just a cheap pre-paint cache.
 */
export function useThemeAttribute(): void {
  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDark = themeId === ThemeId.DARK;
    document.documentElement.setAttribute(THEME_ATTRIBUTE, isDark ? ThemeId.DARK : ThemeId.LIGHT);
    document.documentElement.setAttribute(THEME_ID_ATTRIBUTE, themeId);
    // Background on <html> was set inline by the anti-flash script before
    // React mounted. Clear it now that MUI's CssBaseline owns the body
    // surface — otherwise the inline value lingers and fights theme changes.
    document.documentElement.style.backgroundColor = "";
    try {
      window.localStorage.setItem(StorageKey.THEME, themeId);
      window.localStorage.setItem(
        StorageKey.THEME_FOLLOWS_SYSTEM,
        followsSystem ? "true" : "false",
      );
    } catch {
      /* localStorage blocked — non-fatal, just no anti-flash next time */
    }
  }, [themeId, followsSystem]);
}
