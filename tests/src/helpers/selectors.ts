/**
 * Localised accessible-name anchors. Specs reference these instead of raw
 * strings so a translation tweak on either locale only needs to be patched
 * here.
 *
 * Keys align with the i18n key paths on each side; the values are the
 * actual rendered text (whatever a user/screen-reader sees) for locale-aware
 * role-based selectors like `page.getByRole('button', { name: SELECTORS.en.nav.download })`.
 */
// `with { type: "json" }` is mandatory here — see the note in `constants.ts`.
import DE_LANDING from "../../../landingpage/src/i18n/de.json" with { type: "json" };
import EN_LANDING from "../../../landingpage/src/i18n/en.json" with { type: "json" };

/** Read straight out of the landing page's shipped i18n bundles rather than
 *  retyped here. This used to be a hand-maintained copy and silently rotted:
 *  `nav.privacy` became "Local-first", `nav.contribute` became "Open Source",
 *  and DE `hero.titleLine1` switched its hyphen to U+2011 — five landing specs
 *  went red over pure copy edits nobody had touched the tests for. Reading the
 *  bundle keeps the assertion on the translation KEY (the actual contract)
 *  while still checking the user-visible string, exactly as
 *  `constants.ts::PROVIDER_STATUS_COPY` does for the app. */
export const LANDING_COPY = {
  en: EN_LANDING,
  de: DE_LANDING,
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
