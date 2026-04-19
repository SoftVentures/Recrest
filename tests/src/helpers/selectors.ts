/**
 * Localised accessible-name anchors. Specs reference these instead of raw
 * strings so a translation tweak on either locale only needs to be patched
 * here.
 *
 * Keys align with the i18n key paths on each side; the values are the
 * actual rendered text (whatever a user/screen-reader sees) for locale-aware
 * role-based selectors like `page.getByRole('button', { name: SELECTORS.en.nav.download })`.
 */

export const LANDING_COPY = {
  en: {
    hero: {
      titleLine1: "All your local git repos.",
      titleLine2: "In one calm, native dashboard.",
      downloadFallback: "Download Recrest",
      // Matches `hero.downloadForOs` with interpolated osLabel().
      downloadPrefix: "Download for",
    },
    nav: {
      overview: "Overview",
      privacy: "Privacy",
      contribute: "Contribute",
      github: "GitHub",
      toggleTheme: "Toggle theme",
    },
    language: {
      trigger: "Language",
      en: "English",
      de: "Deutsch",
    },
  },
  de: {
    hero: {
      titleLine1: "Alle deine lokalen Git-Repos.",
      titleLine2: "In einem ruhigen, nativen Dashboard.",
      downloadFallback: "Recrest herunterladen",
      downloadPrefix: "Download für",
    },
    nav: {
      overview: "Überblick",
      privacy: "Datenschutz",
      contribute: "Mitmachen",
      github: "GitHub",
      toggleTheme: "Design umschalten",
    },
    language: {
      trigger: "Sprache",
      en: "English",
      de: "Deutsch",
    },
  },
} as const;

export const APP_COPY = {
  en: {
    nav: {
      dashboard: "Dashboard",
      repos: "Repositories",
      changes: "Changes",
      mergeRequests: "Merge Requests",
      branches: "Branches",
      activity: "Activity",
      settings: "Settings",
    },
    actions: {
      addRepo: "Add repo",
      refresh: "Refresh",
      search: "Search",
    },
  },
  de: {
    nav: {
      dashboard: "Übersicht",
      repos: "Repositories",
      changes: "Änderungen",
      mergeRequests: "Merge Requests",
      branches: "Branches",
      activity: "Aktivität",
      settings: "Einstellungen",
    },
    actions: {
      addRepo: "Repo hinzufügen",
      refresh: "Aktualisieren",
      search: "Suche",
    },
  },
} as const;

export type Locale = "en" | "de";
