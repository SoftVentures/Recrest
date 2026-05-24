import { initReactI18next } from "react-i18next";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import ariaDe from "@/locales/de/aria.json";
import commonDe from "@/locales/de/common.json";
import errorsDe from "@/locales/de/errors.json";
import onboardingDe from "@/locales/de/onboarding.json";
import prsDe from "@/locales/de/prs.json";
import reposDe from "@/locales/de/repos.json";
import settingsDe from "@/locales/de/settings.json";
import ariaEn from "@/locales/en/aria.json";
import commonEn from "@/locales/en/common.json";
import errorsEn from "@/locales/en/errors.json";
import onboardingEn from "@/locales/en/onboarding.json";
import prsEn from "@/locales/en/prs.json";
import reposEn from "@/locales/en/repos.json";
import settingsEn from "@/locales/en/settings.json";

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export const DEFAULT_NAMESPACE = I18nNamespace.COMMON;
export const NAMESPACES = [
  I18nNamespace.COMMON,
  I18nNamespace.REPOS,
  I18nNamespace.PRS,
  I18nNamespace.SETTINGS,
  I18nNamespace.ERRORS,
  I18nNamespace.ONBOARDING,
  I18nNamespace.ARIA,
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Developer-only sink for keys i18next failed to resolve. The Developer tab
 * flips `<html data-i18n-highlight="true">` when tracking is on; CSS consumers
 * can style missing-key `[data-i18n-missing]` spans once a visual highlight is
 * wired up (TODO — currently the tracking set itself is the only deliverable).
 */
const MISSING_I18N_KEYS = new Set<string>();
export function recordMissingI18nKey(key: string): void {
  MISSING_I18N_KEYS.add(key);
}
export function getMissingI18nKeys(): string[] {
  return Array.from(MISSING_I18N_KEYS);
}
export function clearMissingI18nKeys(): void {
  MISSING_I18N_KEYS.clear();
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: DEFAULT_NAMESPACE,
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_lngs, ns, key) => {
      recordMissingI18nKey(`${ns}:${key}`);
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    resources: {
      en: {
        [I18nNamespace.COMMON]: commonEn,
        [I18nNamespace.REPOS]: reposEn,
        [I18nNamespace.PRS]: prsEn,
        [I18nNamespace.SETTINGS]: settingsEn,
        [I18nNamespace.ERRORS]: errorsEn,
        [I18nNamespace.ONBOARDING]: onboardingEn,
        [I18nNamespace.ARIA]: ariaEn,
      },
      de: {
        [I18nNamespace.COMMON]: commonDe,
        [I18nNamespace.REPOS]: reposDe,
        [I18nNamespace.PRS]: prsDe,
        [I18nNamespace.SETTINGS]: settingsDe,
        [I18nNamespace.ERRORS]: errorsDe,
        [I18nNamespace.ONBOARDING]: onboardingDe,
        [I18nNamespace.ARIA]: ariaDe,
      },
    },
  });

export default i18n;
