/**
 * Canonical i18next namespace identifiers. Every `useTranslation()` call and
 * every per-call `{ ns: ... }` option must reference one of these constants
 * instead of an inline string literal — otherwise a renamed JSON bundle would
 * silently fall back to the default namespace and missing-key telemetry would
 * paper over the regression.
 *
 * Extending: add the bundle to `locales/<locale>/<name>.json`, register the
 * import + resource entry in `locales/index.ts`, then add the constant here so
 * the rest of the app can reach it.
 */
export const I18nNamespace = {
  COMMON: "common",
  REPOS: "repos",
  PRS: "prs",
  SETTINGS: "settings",
  ERRORS: "errors",
  ONBOARDING: "onboarding",
  ARIA: "aria",
} as const;

export type I18nNamespace = (typeof I18nNamespace)[keyof typeof I18nNamespace];
