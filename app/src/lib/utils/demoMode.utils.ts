import { DEMO_CHROME_QUERY_PARAM } from "@/lib/constants/platform.constants";

/**
 * Screenshot / demo mode — true when the `?demoChrome=` query param is present.
 *
 * It lets a pure-web session (`yarn dev:web`) impersonate the installed desktop
 * app for marketing captures: the OS titlebar mounts (see `useWindowChrome`) and
 * the production brand mark replaces the orange `</>` dev badge (see `Logo`).
 * A normal dev session never carries the param, so day-to-day `dev:web` is
 * unaffected, and production builds tree-shake the dev plumbing entirely.
 */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(DEMO_CHROME_QUERY_PARAM);
}
