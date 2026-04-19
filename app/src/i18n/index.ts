import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import commonDe from "@/i18n/locales/de/common.json";
import errorsDe from "@/i18n/locales/de/errors.json";
import onboardingDe from "@/i18n/locales/de/onboarding.json";
import prsDe from "@/i18n/locales/de/prs.json";
import reposDe from "@/i18n/locales/de/repos.json";
import settingsDe from "@/i18n/locales/de/settings.json";
import commonEn from "@/i18n/locales/en/common.json";
import errorsEn from "@/i18n/locales/en/errors.json";
import onboardingEn from "@/i18n/locales/en/onboarding.json";
import prsEn from "@/i18n/locales/en/prs.json";
import reposEn from "@/i18n/locales/en/repos.json";
import settingsEn from "@/i18n/locales/en/settings.json";

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export const DEFAULT_NAMESPACE = "common";
export const NAMESPACES = ["common", "repos", "prs", "settings", "errors", "onboarding"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: DEFAULT_NAMESPACE,
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    resources: {
      en: {
        common: commonEn,
        repos: reposEn,
        prs: prsEn,
        settings: settingsEn,
        errors: errorsEn,
        onboarding: onboardingEn,
      },
      de: {
        common: commonDe,
        repos: reposDe,
        prs: prsDe,
        settings: settingsDe,
        errors: errorsDe,
        onboarding: onboardingDe,
      },
    },
  });

export default i18n;
