import { useEffect } from "react";

import { useAppSelector } from "@/store/hooks";

/**
 * Mirrors the active theme onto `<html data-theme="…">` so any non-MUI CSS
 * + the E2E theme spec can detect the active mode. The attribute value is
 * the high-level mode ("light" / "dark"), not the granular themeId — OLED
 * + Glassy both render as "dark" for the purposes of CSS overrides.
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
    const isDark = themeId === "dark" || themeId === "oled" || themeId === "glassy";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-id", themeId);
    // Background on <html> was set inline by the anti-flash script before
    // React mounted. Clear it now that MUI's CssBaseline owns the body
    // surface — otherwise the inline value lingers and fights theme changes.
    document.documentElement.style.backgroundColor = "";
    try {
      window.localStorage.setItem("recrest:theme", themeId);
      window.localStorage.setItem("recrest:theme-follows-system", followsSystem ? "true" : "false");
    } catch {
      /* localStorage blocked — non-fatal, just no anti-flash next time */
    }
  }, [themeId, followsSystem]);
}
