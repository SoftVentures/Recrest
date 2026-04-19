import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import {
  ACCENTS,
  type AccentId,
  FONTS,
  FONT_LABELS,
  FONT_SIZES,
  type FontId,
  type FontSizeId,
  type ThemeMode,
} from "@recrest/shared";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import i18n from "@/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  saveSettings,
  setAccent,
  setFont,
  setFontSize,
  setHighContrast,
  setReducedMotion,
  setTheme,
  setUnderlineLinks,
} from "@/store/slices/settingsSlice";

const LOCALE_FLAG: Record<string, string> = {
  en: "GB",
  de: "DE",
};

function accentSwatch(id: AccentId): string {
  switch (id) {
    case "coral":
      return "#f46a3d";
    case "blue":
      return "#3d7bff";
    case "green":
      return "#10b981";
    case "purple":
      return "#8b5cf6";
    case "pink":
      return "#ec4899";
    case "amber":
      return "#f59e0b";
  }
}

function fontCssFamily(id: FontId): string {
  switch (id) {
    case "inter":
      return "Inter, system-ui, sans-serif";
    case "manrope":
      return "Manrope, system-ui, sans-serif";
    case "plex":
      return "'IBM Plex Sans', system-ui, sans-serif";
    case "system":
      return "-apple-system, 'Segoe UI', system-ui, sans-serif";
    case "opendyslexic":
      return "OpenDyslexic, system-ui, sans-serif";
  }
}

export function AppearanceSettings() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const s = useAppSelector((st) => st.settings);

  const onThemeChange = (v: ThemeMode) => {
    dispatch(setTheme(v));
    void dispatch(saveSettings({ theme: v }));
  };
  const onLocaleChange = (v: string) => {
    void dispatch(saveSettings({ locale: v }));
    void i18n.changeLanguage(v);
  };

  return (
    <>
      <section className="a-set-section">
        <h3>{t("sections.appearance")}</h3>
        <div className="a-set-card">
          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("fields.theme")}</div>
              <div className="a-set-row-sub">{t("fields.theme_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Select value={s.theme} onValueChange={(v) => onThemeChange(v as ThemeMode)}>
                <SelectTrigger className="a-set-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("theme.system")}</SelectItem>
                  <SelectItem value="light">{t("theme.light")}</SelectItem>
                  <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("fields.language")}</div>
              <div className="a-set-row-sub">{t("fields.language_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Select value={s.locale} onValueChange={onLocaleChange}>
                <SelectTrigger className="a-set-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <span className="a-locale-opt">
                      <ReactCountryFlag
                        countryCode={LOCALE_FLAG.en!}
                        svg
                        style={{ width: "1.1em", height: "1.1em", borderRadius: 2 }}
                      />
                      English
                    </span>
                  </SelectItem>
                  <SelectItem value="de">
                    <span className="a-locale-opt">
                      <ReactCountryFlag
                        countryCode={LOCALE_FLAG.de!}
                        svg
                        style={{ width: "1.1em", height: "1.1em", borderRadius: 2 }}
                      />
                      Deutsch
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("fields.accent")}</div>
              <div className="a-set-row-sub">{t("fields.accent_sub")}</div>
            </div>
            <div className="a-set-row-r a-accent-row">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className="a-accent-chip"
                  data-active={s.accent === a ? "true" : undefined}
                  onClick={() => dispatch(setAccent(a))}
                  title={t(`accent.${a}`, { defaultValue: a })}
                  style={{ background: accentSwatch(a) }}
                  aria-label={a}
                />
              ))}
            </div>
          </div>

          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("fields.font")}</div>
              <div className="a-set-row-sub">{t("fields.font_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Select value={s.font} onValueChange={(v) => dispatch(setFont(v as FontId))}>
                <SelectTrigger className="a-set-trigger" style={{ minWidth: 180 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      <span style={{ fontFamily: fontCssFamily(f) }}>{FONT_LABELS[f]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("fields.font_size")}</div>
              <div className="a-set-row-sub">{t("fields.font_size_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Select
                value={s.fontSize}
                onValueChange={(v) => dispatch(setFontSize(v as FontSizeId))}
              >
                <SelectTrigger className="a-set-trigger" style={{ minWidth: 160 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map((sz) => (
                    <SelectItem key={sz} value={sz}>
                      {t(`font_size.${sz}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="a-set-section">
        <h3>{t("accessibility.title")}</h3>
        <div className="a-set-card">
          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("accessibility.high_contrast")}</div>
              <div className="a-set-row-sub">{t("accessibility.high_contrast_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Switch
                checked={s.highContrast}
                onCheckedChange={(v) => dispatch(setHighContrast(v))}
              />
            </div>
          </div>
          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("accessibility.reduced_motion")}</div>
              <div className="a-set-row-sub">{t("accessibility.reduced_motion_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Switch
                checked={s.reducedMotion}
                onCheckedChange={(v) => dispatch(setReducedMotion(v))}
              />
            </div>
          </div>
          <div className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{t("accessibility.underline_links")}</div>
              <div className="a-set-row-sub">{t("accessibility.underline_links_sub")}</div>
            </div>
            <div className="a-set-row-r">
              <Switch
                checked={s.underlineLinks}
                onCheckedChange={(v) => dispatch(setUnderlineLinks(v))}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
