import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import { DateFormat, REGIONS, TimeFormat, WeekStart } from "@recrest/shared";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { formatAbsolute, resolveLocale, useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setDateFormat,
  setLocale,
  setRegion,
  setTimeFormat,
  setWeekStart,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const LOCALES: { code: string; countryCode: string; label: string }[] = [
  { code: "en", countryCode: "GB", label: "English" },
  { code: "de", countryCode: "DE", label: "Deutsch" },
];

// "Follow language" sentinel value used in the region <Select>. Selects can't
// hold `null` as a value, so we round-trip through this sentinel string.
const FOLLOW_LANGUAGE = "__follow__" as const;

// SVG flags scale crisply at the small icon size — emoji-based flags render
// inconsistently across Windows (no native colour-emoji font for region flags).
const LocaleFlag = styled(ReactCountryFlag)({
  marginRight: 8,
  width: 16,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  display: "inline-block",
});

const PreviewBadge = styled(Box)(({ theme }) => ({
  display: "inline-block",
  marginTop: 4,
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const localePrefs = useAppSelector((s) => s.settings.localePrefs);
  const language = (i18n.language.split("-")[0] ?? "en") || "en";
  const dt = useDateTimeFormat();

  const filteredRegions = REGIONS.filter((r) => r.languages.includes(language));
  const now = new Date();
  // Previews always render as absolute so changing the toggle is visible —
  // showing "just now" for both options would be confusing.
  const dateFormatPreview = formatAbsolute(now, { locale: dt.locale, timeFormat: dt.timeFormat });
  const timeFormatPreview = formatAbsolute(now, { locale: dt.locale, timeFormat: dt.timeFormat });
  const regionPreview = formatAbsolute(now, {
    locale: resolveLocale(language, localePrefs.region),
    timeFormat: dt.timeFormat,
  });

  return (
    <SettingsSection title={t("settings.sections.language")}>
      <SettingsRow label={t("settings.fields.language")} sub={t("settings.fields.language_sub")}>
        <SelectControl
          size="small"
          value={language}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const next = e.target.value as string;
            void i18n.changeLanguage(next);
            dispatch(setLocale(next));
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.language") } }}
          data-testid={TEST_IDS.settings.general.localeSelect}
        >
          {LOCALES.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              <LocaleFlag countryCode={l.countryCode} svg aria-hidden />
              {l.label}
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.date_format")}
        sub={
          <>
            {t("settings.fields.date_format_sub")}
            <br />
            <PreviewBadge component="span">{dateFormatPreview}</PreviewBadge>
          </>
        }
      >
        <SelectControl
          size="small"
          value={localePrefs.dateFormat}
          onChange={(e: SelectChangeEvent<unknown>) => {
            dispatch(setDateFormat(e.target.value as DateFormat));
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.date_format") } }}
          data-testid={TEST_IDS.settings.general.dateFormatSelect}
        >
          <MenuItem value={DateFormat.RELATIVE}>
            {t("settings.fields.date_format_relative")}
          </MenuItem>
          <MenuItem value={DateFormat.ABSOLUTE}>
            {t("settings.fields.date_format_absolute")}
          </MenuItem>
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.time_format")}
        sub={
          <>
            {t("settings.fields.time_format_sub")}
            <br />
            <PreviewBadge component="span">{timeFormatPreview}</PreviewBadge>
          </>
        }
      >
        <SelectControl
          size="small"
          value={localePrefs.timeFormat}
          onChange={(e: SelectChangeEvent<unknown>) => {
            dispatch(setTimeFormat(e.target.value as TimeFormat));
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.time_format") } }}
          data-testid={TEST_IDS.settings.general.timeFormatSelect}
        >
          <MenuItem value={TimeFormat.TWELVE_HOUR}>{t("settings.fields.time_format_12h")}</MenuItem>
          <MenuItem value={TimeFormat.TWENTY_FOUR_HOUR}>
            {t("settings.fields.time_format_24h")}
          </MenuItem>
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.week_start")}
        sub={t("settings.fields.week_start_sub")}
      >
        <SelectControl
          size="small"
          value={localePrefs.weekStart}
          onChange={(e: SelectChangeEvent<unknown>) => {
            dispatch(setWeekStart(e.target.value as WeekStart));
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.week_start") } }}
          data-testid={TEST_IDS.settings.general.weekStartSelect}
        >
          <MenuItem value={WeekStart.MONDAY}>{t("settings.fields.week_start_monday")}</MenuItem>
          <MenuItem value={WeekStart.SUNDAY}>{t("settings.fields.week_start_sunday")}</MenuItem>
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.region")}
        sub={
          <>
            {t("settings.fields.region_sub")}
            <br />
            <PreviewBadge component="span">{regionPreview}</PreviewBadge>
          </>
        }
      >
        <SelectControl
          size="small"
          value={localePrefs.region ?? FOLLOW_LANGUAGE}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const next = e.target.value as string;
            dispatch(setRegion(next === FOLLOW_LANGUAGE ? null : next));
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.region") } }}
          data-testid={TEST_IDS.settings.general.regionSelect}
        >
          <MenuItem value={FOLLOW_LANGUAGE}>{t("settings.fields.region_follow_language")}</MenuItem>
          {filteredRegions.map((r) => (
            <MenuItem key={r.code} value={r.code}>
              <LocaleFlag countryCode={r.code} svg aria-hidden />
              {t(r.labelKey)}
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>
    </SettingsSection>
  );
}

export default LanguageSection;
