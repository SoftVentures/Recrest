import { useEffect, useState } from "react";

export type LegalRoute = "imprint" | "privacy-policy" | "accessibility";

const LEGAL_ROUTES: readonly LegalRoute[] = ["imprint", "privacy-policy", "accessibility"];

function parseHash(hash: string): LegalRoute | null {
  const match = hash.match(/^#\/legal\/([a-z-]+)$/);
  if (!match) return null;
  const slug = match[1] as LegalRoute;
  return LEGAL_ROUTES.includes(slug) ? slug : null;
}

export function useLegalRoute(): LegalRoute | null {
  const [route, setRoute] = useState<LegalRoute | null>(() =>
    typeof window === "undefined" ? null : parseHash(window.location.hash),
  );

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    if (route) window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);

  return route;
}

export function navigateToLegal(route: LegalRoute): void {
  window.location.hash = `#/legal/${route}`;
}
