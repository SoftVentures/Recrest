import { useEffect } from "react";

import type { ThemeMode } from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

/** Applies the selected theme mode to the document root. */
export function useThemeEffect(): void {
  const theme = useAppSelector((s) => s.settings.theme);

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
    };

    apply(theme);

    if (theme !== "system") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handler = () => apply("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);
}
