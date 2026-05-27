import { useEffect, useState } from "react";

import { useTheme } from "@mui/material/styles";

import { loadRepoLogoUri, pickLogoPath } from "@/lib/utils/repoLogo.utils";

/** Resolves the auto-detected repo logo (light or dark variant based on the
 *  current MUI theme) to a base64 data URI. Returns `null` when the repo
 *  has no logo on disk or the IPC fetch failed. */
export function useRepoLogo(
  logoPath: string | null | undefined,
  logoDarkPath: string | null | undefined,
): string | null {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const path = pickLogoPath(logoPath ?? null, logoDarkPath ?? null, isDark);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUri(null);
      return;
    }
    let alive = true;
    void loadRepoLogoUri(path).then((next) => {
      if (alive) setUri(next);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  return uri;
}
