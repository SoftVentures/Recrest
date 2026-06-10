/**
 * Cross-window messaging contract between the marketing landingpage and the
 * embedded live-demo build of the app (`vite build --mode demo`).
 *
 * The landingpage posts these messages into the demo iframe so the demo's
 * theme/locale follow the landingpage toggles without reloading the iframe.
 */
export const DemoBridgeMessageType = {
  SET_THEME: "recrest:demo:set-theme",
  SET_LOCALE: "recrest:demo:set-locale",
} as const;
export type DemoBridgeMessageType =
  (typeof DemoBridgeMessageType)[keyof typeof DemoBridgeMessageType];

export interface DemoBridgeMessage {
  type: DemoBridgeMessageType;
  /** `"light" | "dark"` for SET_THEME, a BCP-47 locale (`"en" | "de"`) for SET_LOCALE. */
  value: string;
}

/** Query params the demo build reads on boot (initial theme/locale). */
export const DemoQueryParam = {
  THEME: "theme",
  LOCALE: "lng",
} as const;

/** Path segment under the landingpage base where the demo build is deployed. */
export const DEMO_PATH_SEGMENT = "demo/";

/** Virtual desktop size the landingpage renders the demo at (then CSS-scales). */
export const DEMO_VIEWPORT = { width: 1280, height: 800 } as const;
