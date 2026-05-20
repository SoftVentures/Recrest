import { useEffect } from "react";

import type { ThemeMode } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

/** Applies theme, accent, font and accessibility preferences to `<html>`.
 *
 * Writes both the Tailwind-convention `.dark` class and the design-token
 * attributes `data-theme`, `data-accent`, `data-font`, `data-font-size`,
 * `data-reduced-motion`, `data-high-contrast`, `data-underline-links`. */
export function useThemeEffect(): void {
  const theme = useAppSelector((s) => s.settings.theme);
  const accent = useAppSelector((s) => s.settings.accent);
  const font = useAppSelector((s) => s.settings.font);
  const fontSize = useAppSelector((s) => s.settings.fontSize);
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: ThemeMode) => {
      const resolved =
        mode === "system"
          ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : mode;
      root.classList.toggle("dark", resolved === "dark");
      root.setAttribute("data-theme", resolved);
    };

    apply(theme);

    if (theme !== "system") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handler = () => apply("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
  }, [font]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-high-contrast", highContrast ? "true" : "false");
    root.setAttribute("data-reduced-motion", reducedMotion ? "true" : "false");
    root.setAttribute("data-underline-links", underlineLinks ? "true" : "false");
  }, [highContrast, reducedMotion, underlineLinks]);
}
