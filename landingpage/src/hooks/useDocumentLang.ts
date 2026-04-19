import { useEffect } from "react";

import { useTranslation } from "react-i18next";

export function useDocumentLang(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lng: string) => {
      const short = lng.split("-")[0] ?? "en";
      document.documentElement.lang = short;
    };
    apply(i18n.resolvedLanguage ?? i18n.language ?? "en");
    i18n.on("languageChanged", apply);
    return () => i18n.off("languageChanged", apply);
  }, [i18n]);
}
