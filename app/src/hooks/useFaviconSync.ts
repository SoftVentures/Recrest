import { useEffect } from "react";

import IconDark from "@/assets/recrest-icon-dark.svg?url";
import IconDevDark from "@/assets/recrest-icon-dev-dark.svg?url";
import IconDevLight from "@/assets/recrest-icon-dev-light.svg?url";
import IconLight from "@/assets/recrest-icon-light.svg?url";
import { useAppSelector } from "@/store/hooks";

/**
 * Swap the browser tab favicon to match the active theme + build flavour.
 *
 * Matrix:
 *   prod, light → recrest-icon-light.svg
 *   prod, dark  → recrest-icon-dark.svg
 *   dev,  light → recrest-icon-dev-light.svg
 *   dev,  dark  → recrest-icon-dev-dark.svg
 *
 * The dev variants carry the orange `</>` badge so a glance at the browser
 * tab is enough to tell whether you're looking at the dev build or the
 * installed app.
 *
 * Implementation note: we mutate the existing `<link rel="icon">` elements
 * in `<head>` instead of injecting new ones. Replacing the same `href`
 * sidesteps a Chrome / WebKit quirk where adding/removing the link tag
 * mid-session sometimes leaves the old icon cached on the tab.
 */
export function useFaviconSync(): void {
  const themeId = useAppSelector((s) => s.settings.themeId);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDark = themeId === "dark" || themeId === "oled" || themeId === "glassy";
    const isDev = import.meta.env.DEV;

    const href = isDev ? (isDark ? IconDevDark : IconDevLight) : isDark ? IconDark : IconLight;

    // Target the SVG link specifically — modern browsers (Chrome, FF,
    // Edge, Safari 17+) prefer SVG over PNG/ICO when both are listed.
    // Leaving the PNG/ICO fallbacks alone is correct: they cover older
    // browsers that can't render SVG favicons at all.
    let svgLink = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
    if (!svgLink) {
      svgLink = document.createElement("link");
      svgLink.rel = "icon";
      svgLink.type = "image/svg+xml";
      document.head.appendChild(svgLink);
    }
    svgLink.href = href;
  }, [themeId]);
}
