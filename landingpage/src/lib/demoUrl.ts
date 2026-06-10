import { DEMO_PATH_SEGMENT, DemoQueryParam } from "@recrest/shared";

export interface DemoUrlOptions {
  /** Landingpage base path (Vite `import.meta.env.BASE_URL`). */
  base: string;
  /** `import.meta.env.DEV` — in dev the demo is the `yarn dev:web` server. */
  dev: boolean;
  theme: "light" | "dark";
  locale: string;
}

/** The `yarn dev:web` server (DEV_PORT_WEB default). Dev convenience only. */
const DEV_DEMO_ORIGIN = "http://localhost:3000/";

/**
 * Collapse an i18next language tag to the two locales the demo ships.
 * The landingpage detector runs with `nonExplicitSupportedLngs`, so
 * `i18n.language` can be a regional tag like `de-DE` — a strict equality
 * check against "de" would silently fall back to English.
 */
export function toDemoLocale(language: string | undefined): "en" | "de" {
  return language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function buildDemoUrl({ base, dev, theme, locale }: DemoUrlOptions): string {
  const root = dev ? DEV_DEMO_ORIGIN : `${base}${DEMO_PATH_SEGMENT}`;
  const params = new URLSearchParams({
    [DemoQueryParam.THEME]: theme,
    [DemoQueryParam.LOCALE]: locale,
  });
  return `${root}?${params.toString()}`;
}
