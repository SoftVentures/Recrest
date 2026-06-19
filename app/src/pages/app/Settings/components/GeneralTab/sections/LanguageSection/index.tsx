import { useMemo } from "react";

import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import { Autocomplete, Box, MenuItem, type SelectChangeEvent, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

import { COUNTRY_PRIMARY_TIMEZONE, DateFormat, TimeFormat, WeekStart } from "@recrest/shared";

import { Globe, Languages } from "lucide-react";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { formatAbsolute, formatRelative, resolveLocale } from "@/lib/utils/datetime.utils";
import {
  type CountryOption,
  countryOptions,
  systemTimeZone,
  timeZoneCountryCode,
  timeZoneOffsetLabel,
  timeZoneOptions,
} from "@/lib/utils/locale.utils";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setDateFormat,
  setLocale,
  setRegion,
  setTimeFormat,
  setTimeZone,
  setWeekStart,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const LOCALES: { code: string; countryCode: string; label: string }[] = [
  { code: "en", countryCode: "GB", label: "English" },
  { code: "de", countryCode: "DE", label: "Deutsch" },
];

// The five concrete date presets, in the order they appear in the picker.
const DATE_FORMAT_OPTIONS: DateFormat[] = [
  DateFormat.RELATIVE,
  DateFormat.NUMERIC,
  DateFormat.MEDIUM,
  DateFormat.FULL,
  DateFormat.ISO,
];

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

// Flag inside an Autocomplete option row — no own margin (the row's `gap`
// handles spacing) and a fixed 16px slot so flags align in a clean column.
const RowFlag = styled(ReactCountryFlag)({
  width: 16,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  display: "inline-block",
});

// 16px left slot for rows without a flag: the "follow" sentinel (icon) and
// time zones that map to no single country (empty spacer) — keeps the text
// column aligned with flagged rows.
const IconSlot = styled(Box)(({ theme }) => ({
  width: 16,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.information,
})) as typeof Box;

const PickerAutocomplete = styled(Autocomplete)(({ theme }) => ({
  minWidth: 240,
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.surface.interface.backElevation,
    borderRadius: 8,
    fontSize: 12.5,
    paddingTop: 1,
    paddingBottom: 1,
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
})) as typeof Autocomplete;

// Option row = fixed-position grid so flags align in a left column, names
// truncate with an ellipsis, and the right-hand meta (offset / code) lines up
// in its own right-aligned column down the whole list.
const OptionRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  width: "100%",
  minWidth: 0,
});

const OptionLabel = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

const OptionMeta = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  width: 84,
  textAlign: "right",
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  fontSize: 11,
})) as typeof Box;

// Float the popup 4px clear of the input instead of sitting flush on it.
const POPPER_OFFSET_MODIFIERS = [
  { name: "offset", options: { offset: [0, 4] as [number, number] } },
];

const FormatPreview = styled(Box)(({ theme }) => ({
  marginLeft: "auto",
  paddingLeft: 16,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  fontSize: 11,
})) as typeof Box;

const FormatOptionRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
});

export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const localePrefs = useAppSelector((s) => s.settings.localePrefs);
  const language = (i18n.language.split("-")[0] ?? "en") || "en";

  const now = useMemo(() => new Date(), []);
  const sysZone = useMemo(() => systemTimeZone(), []);

  // Sentinel for the explicit "follow" option at the top of each picker.
  // Country options carry it as a code; time zones as an empty-string id.
  const FOLLOW = "";

  // Country picker: real options prefixed with a "Follow language" sentinel.
  const countries = useMemo(() => countryOptions(language), [language]);
  const countryItems = useMemo<CountryOption[]>(
    () => [{ code: FOLLOW, label: t("settings.fields.country_follow_language") }, ...countries],
    [countries, t],
  );

  // Time-zone picker: empty-string sentinel + the full IANA list. Precompute
  // each zone's offset label and country (for the flag) so `renderOption`
  // stays cheap and the right-hand offset column stays aligned.
  const zones = useMemo(() => timeZoneOptions(), []);
  const zoneItems = useMemo(() => [FOLLOW, ...zones], [zones]);
  const zoneOffset = useMemo(
    () => new Map(zones.map((z) => [z, timeZoneOffsetLabel(z, now)])),
    [zones, now],
  );
  const zoneFlag = useMemo(() => new Map(zones.map((z) => [z, timeZoneCountryCode(z)])), [zones]);
  const followTzLabel = t("settings.fields.timezone_follow_system", { zone: sysZone });

  const selectedCountry =
    countryItems.find((c) => c.code === (localePrefs.region ?? FOLLOW)) ?? countryItems[0];
  const previewLocale = resolveLocale(language, localePrefs.region);

  // Live preview for each date preset, rendered against "now" so the user sees
  // exactly what each option produces in their locale.
  const datePreview = (df: DateFormat): string =>
    df === DateFormat.RELATIVE
      ? formatRelative(now, previewLocale)
      : formatAbsolute(now, {
          locale: previewLocale,
          timeFormat: localePrefs.timeFormat,
          timeZone: localePrefs.timeZone,
          dateFormat: df,
          withTime: false,
        });

  const onPickCountry = (next: CountryOption | null) => {
    // Sentinel (code "") or cleared input both mean "follow language" → null.
    const code = next && next.code ? next.code : null;
    dispatch(setRegion(code));
    // Auto-suggest the country's primary time zone (editable afterwards).
    // Only on an explicit country pick, and only if we know a primary zone —
    // picking "Follow language" leaves the time-zone choice untouched.
    if (code) {
      const suggested = COUNTRY_PRIMARY_TIMEZONE[code];
      if (suggested) dispatch(setTimeZone(suggested));
    }
  };

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
        sub={t("settings.fields.date_format_sub")}
      >
        <SelectControl
          size="small"
          value={localePrefs.dateFormat}
          onChange={(e: SelectChangeEvent<unknown>) => {
            dispatch(setDateFormat(e.target.value as DateFormat));
          }}
          renderValue={(v) => t(`settings.fields.date_format_opt.${v as string}`)}
          slotProps={{ input: { "aria-label": t("settings.fields.date_format") } }}
          data-testid={TEST_IDS.settings.general.dateFormatSelect}
        >
          {DATE_FORMAT_OPTIONS.map((df) => (
            <MenuItem key={df} value={df}>
              <FormatOptionRow>
                {t(`settings.fields.date_format_opt.${df}`)}
                <FormatPreview component="span">{datePreview(df)}</FormatPreview>
              </FormatOptionRow>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.time_format")}
        sub={t("settings.fields.time_format_sub")}
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

      <SettingsRow label={t("settings.fields.country")} sub={t("settings.fields.country_sub")}>
        <PickerAutocomplete
          size="small"
          options={countryItems}
          value={selectedCountry}
          onChange={(_e, next) => onPickCountry(next as CountryOption | null)}
          getOptionLabel={(o) => (o as CountryOption).label}
          isOptionEqualToValue={(o, v) => (o as CountryOption).code === (v as CountryOption).code}
          slotProps={{ popper: { modifiers: POPPER_OFFSET_MODIFIERS } }}
          renderOption={(props, option) => {
            const { key, ...rest } = props as { key: string } & React.HTMLAttributes<HTMLLIElement>;
            const c = option as CountryOption;
            if (c.code === FOLLOW) {
              return (
                <li key={key} {...rest}>
                  <OptionRow>
                    <IconSlot component="span">
                      <Languages size={13} aria-hidden />
                    </IconSlot>
                    <OptionLabel component="span">{c.label}</OptionLabel>
                  </OptionRow>
                </li>
              );
            }
            return (
              <li key={key} {...rest}>
                <OptionRow>
                  <RowFlag countryCode={c.code} svg aria-hidden />
                  <OptionLabel component="span">{c.label}</OptionLabel>
                  <OptionMeta component="span">{c.code}</OptionMeta>
                </OptionRow>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={t("settings.fields.country_follow_language")}
              slotProps={{
                ...params.slotProps,
                htmlInput: {
                  ...params.slotProps.htmlInput,
                  "aria-label": t("settings.fields.country"),
                },
              }}
            />
          )}
          data-testid={TEST_IDS.settings.general.countrySelect}
        />
      </SettingsRow>

      <SettingsRow label={t("settings.fields.timezone")} sub={t("settings.fields.timezone_sub")}>
        <PickerAutocomplete
          size="small"
          options={zoneItems}
          value={localePrefs.timeZone ?? FOLLOW}
          onChange={(_e, next) => dispatch(setTimeZone((next as string | null) || null))}
          getOptionLabel={(o) => ((o as string) === FOLLOW ? followTzLabel : (o as string))}
          isOptionEqualToValue={(o, v) => (o as string) === (v as string)}
          slotProps={{ popper: { modifiers: POPPER_OFFSET_MODIFIERS } }}
          renderOption={(props, option) => {
            const { key, ...rest } = props as { key: string } & React.HTMLAttributes<HTMLLIElement>;
            const zone = option as string;
            if (zone === FOLLOW) {
              return (
                <li key={key} {...rest}>
                  <OptionRow>
                    <IconSlot component="span">
                      <Globe size={13} aria-hidden />
                    </IconSlot>
                    <OptionLabel component="span">{followTzLabel}</OptionLabel>
                  </OptionRow>
                </li>
              );
            }
            const flag = zoneFlag.get(zone) ?? null;
            return (
              <li key={key} {...rest}>
                <OptionRow>
                  {flag ? (
                    <RowFlag countryCode={flag} svg aria-hidden />
                  ) : (
                    <IconSlot component="span" />
                  )}
                  <OptionLabel component="span">{zone}</OptionLabel>
                  <OptionMeta component="span">{zoneOffset.get(zone) ?? ""}</OptionMeta>
                </OptionRow>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={t("settings.fields.timezone_follow_system", { zone: sysZone })}
              slotProps={{
                ...params.slotProps,
                htmlInput: {
                  ...params.slotProps.htmlInput,
                  "aria-label": t("settings.fields.timezone"),
                },
              }}
            />
          )}
          data-testid={TEST_IDS.settings.general.timeZoneSelect}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export default LanguageSection;
