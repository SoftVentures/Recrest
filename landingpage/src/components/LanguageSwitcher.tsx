import { useEffect, useRef, useState } from "react";

import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import { LOCALE_STORAGE_KEY, type Locale, SUPPORTED_LOCALES } from "../i18n";
import { ChevronDownIcon } from "./icons";

type LocaleMeta = {
  code: Locale;
  countryCode: string;
  label: string;
};

const LOCALES: LocaleMeta[] = [
  { code: "en", countryCode: "US", label: "English" },
  { code: "de", countryCode: "DE", label: "Deutsch" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => i18n.resolvedLanguage?.startsWith(l.code)) ?? LOCALES[0]!;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (code: Locale) => {
    void i18n.changeLanguage(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher" ref={containerRef}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("footer.language")}
        onClick={() => setOpen((o) => !o)}
      >
        <ReactCountryFlag
          countryCode={current.countryCode}
          svg
          style={{ width: 18, height: 14, borderRadius: 2 }}
          aria-hidden
        />
        <span className="lang-label">{current.label}</span>
        <ChevronDownIcon
          style={{
            transition: "transform .15s ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t("footer.language")}>
          {LOCALES.map((locale) => {
            const active = locale.code === current.code;
            return (
              <li key={locale.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`lang-option${active ? " active" : ""}`}
                  onClick={() => select(locale.code)}
                >
                  <ReactCountryFlag
                    countryCode={locale.countryCode}
                    svg
                    style={{ width: 18, height: 14, borderRadius: 2 }}
                    aria-hidden
                  />
                  <span>{locale.label}</span>
                  <span className="lang-code">{locale.code.toUpperCase()}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { SUPPORTED_LOCALES };
