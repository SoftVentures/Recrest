import { useEffect, useState } from "react";

import { type LogoBlob, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

/** Module-level cache: path+theme → data URI. Keyed by path because the
 *  same logo file may be referenced by multiple repos (unlikely but cheap). */
const CACHE = new Map<string, string>();
/** Paths we've tried and failed to load — avoids hammering IPC on every render. */
const FAILED = new Set<string>();

interface Args {
  logoPath: string | null;
  logoDarkPath: string | null;
}

/** Loads the repo's auto-detected logo (light or dark depending on theme)
 *  and returns it as a ready-to-use `data:…` URI. Falls back to null so
 *  callers can show the letter-tile when no logo exists. */
export function useRepoLogo({ logoPath, logoDarkPath }: Args): string | null {
  const theme = useAppSelector((s) => s.settings.theme);
  const resolvedDark = useResolvedDarkMode(theme);
  const wanted = resolvedDark ? (logoDarkPath ?? logoPath) : logoPath;

  const [dataUrl, setDataUrl] = useState<string | null>(() =>
    wanted ? (CACHE.get(wanted) ?? null) : null,
  );

  useEffect(() => {
    if (!wanted) {
      setDataUrl(null);
      return;
    }
    const cached = CACHE.get(wanted);
    if (cached) {
      setDataUrl(cached);
      return;
    }
    if (FAILED.has(wanted) || !isTauri()) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;
    invoke<LogoBlob>(TauriCommand.LOAD_LOGO_BYTES, { path: wanted })
      .then((blob) => {
        const uri = `data:${blob.mimeType};base64,${blob.data}`;
        CACHE.set(wanted, uri);
        if (!cancelled) setDataUrl(uri);
      })
      .catch(() => {
        FAILED.add(wanted);
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [wanted]);

  return dataUrl;
}

function useResolvedDarkMode(theme: "light" | "dark" | "system"): boolean {
  const [isDark, setIsDark] = useState(() => resolveDark(theme));
  useEffect(() => {
    setIsDark(resolveDark(theme));
    if (theme !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = () => setIsDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  return isDark;
}

function resolveDark(theme: "light" | "dark" | "system"): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
