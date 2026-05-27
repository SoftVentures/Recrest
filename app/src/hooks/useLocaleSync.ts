import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/reducers/settingsReducer";

/**
 * Keeps the i18next language and Redux `settings.locale` in lockstep.
 *
 * i18next owns its own localStorage persistence via the LanguageDetector
 * cache, so we read from there on mount and mirror into Redux. Any
 * subsequent `i18n.changeLanguage(...)` (e.g. from the language picker)
 * flows into Redux through the `languageChanged` event.
 */
export function useLocaleSync(): void {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const storeLocale = useAppSelector((s) => s.settings.locale);

  useEffect(() => {
    if (i18n.language && i18n.language !== storeLocale) {
      dispatch(setLocale(i18n.language));
    }
    const handler = (lng: string) => dispatch(setLocale(lng));
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [dispatch, i18n, storeLocale]);
}
