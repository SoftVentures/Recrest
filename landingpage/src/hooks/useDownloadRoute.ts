import { useEffect, useState } from "react";

const DOWNLOAD_HASH = "#/download";

function isDownloadHash(hash: string): boolean {
  return hash === DOWNLOAD_HASH;
}

export function useDownloadRoute(): boolean {
  const [active, setActive] = useState<boolean>(() =>
    typeof window === "undefined" ? false : isDownloadHash(window.location.hash),
  );

  useEffect(() => {
    const handler = () => setActive(isDownloadHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    if (active) window.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);

  return active;
}
