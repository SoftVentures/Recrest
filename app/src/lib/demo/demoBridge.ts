import { type DemoBridgeMessage, DemoBridgeMessageType, DemoQueryParam } from "@recrest/shared";

import { ThemeId } from "@/lib/constants/theme.constants";
import { setLocale, setThemeId } from "@/store/actions/settings.actions";

/** Locales the demo accepts from the embedding page. */
const DEMO_LOCALES = new Set(["en", "de"]);
/** Only the two plain appearance modes are steerable from the landingpage. */
const DEMO_THEMES = new Set<string>([ThemeId.LIGHT, ThemeId.DARK]);

export interface DemoParams {
  themeId: ThemeId | null;
  locale: string | null;
}

/** Parse `?theme=` / `?lng=` from a search string (defaults to `location.search`). */
export function readDemoParams(search: string = window.location.search): DemoParams {
  const params = new URLSearchParams(search);
  const theme = params.get(DemoQueryParam.THEME);
  const locale = params.get(DemoQueryParam.LOCALE);
  return {
    themeId: theme && DEMO_THEMES.has(theme) ? (theme as ThemeId) : null,
    locale: locale && DEMO_LOCALES.has(locale) ? locale : null,
  };
}

interface DispatchLike {
  dispatch: (action: unknown) => unknown;
}

/**
 * Listen for landingpage `postMessage`s and mirror them into the demo.
 * No origin allow-list: the message types only steer cosmetic state
 * (theme/locale) and values are validated against closed sets, so a hostile
 * embedder could at worst flip the demo to dark mode.
 *
 * Returns an unsubscribe function. The demo bootstrap installs the bridge
 * exactly once for the page lifetime and may discard it, but tests (and any
 * future repeated embedding) need the listener to be removable.
 */
export function installDemoBridge(
  store: DispatchLike,
  changeLanguage: (lng: string) => unknown,
): () => void {
  const handler = (event: MessageEvent): void => {
    const msg = event.data as Partial<DemoBridgeMessage> | null;
    if (!msg || typeof msg !== "object" || typeof msg.value !== "string") return;
    if (msg.type === DemoBridgeMessageType.SET_THEME && DEMO_THEMES.has(msg.value)) {
      store.dispatch(setThemeId(msg.value as ThemeId));
    } else if (msg.type === DemoBridgeMessageType.SET_LOCALE && DEMO_LOCALES.has(msg.value)) {
      void changeLanguage(msg.value);
      store.dispatch(setLocale(msg.value));
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
