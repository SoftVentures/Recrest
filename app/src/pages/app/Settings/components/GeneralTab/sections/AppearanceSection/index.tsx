import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  type AccentId,
  CUSTOM_FONT_PREFIX,
  type FontSelection,
  type FontSizeId,
  LIGATURE_MODES,
  LIGATURE_MODE_LABELS,
  type LigatureMode,
  MONO_FONT_IDS,
  SANS_FONT_IDS,
} from "@recrest/shared";

import {
  AArrowDown,
  AArrowUp,
  ALargeSmall,
  Layers,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Type,
} from "lucide-react";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { PRIMARY_COLOR_SCHEMES, type PrimaryColorScheme } from "@/lib/constants/theme.constants";
import {
  type ThemeChoice,
  codeLigatureFeatureSettings,
  fontCssFamily,
  fontLabel,
  fontSizeLabel,
  themeChoiceLabel,
} from "@/lib/utils/appearance.utils";
import { CustomFontRow } from "@/pages/app/Settings/components/GeneralTab/sections/AppearanceSection/parts/CustomFontRow";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setCodeFont,
  setCodeLigatures,
  setFollowsSystem,
  setFont,
  setFontSize,
  setLocale,
  setPrimaryColor,
  setThemeId,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const ACCENT_SCHEME_MAP: Record<AccentId, PrimaryColorScheme> = {
  coral: "default",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
  amber: "amber",
};
const SCHEME_TO_ACCENT: Record<PrimaryColorScheme, AccentId> = {
  default: "coral",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
  amber: "amber",
};
const ACCENT_IDS: AccentId[] = ["coral", "blue", "green", "purple", "pink", "amber"];
const FONT_SIZE_IDS: FontSizeId[] = ["sm", "md", "lg", "xl"];
const LIGATURE_MODE_IDS: LigatureMode[] = [...LIGATURE_MODES];
const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark", "oled", "glassy"];

const LOCALES: { code: string; countryCode: string; label: string }[] = [
  { code: "en", countryCode: "GB", label: "English" },
  { code: "de", countryCode: "DE", label: "Deutsch" },
];

const FONT_SIZE_ICONS: Record<FontSizeId, typeof Type> = {
  sm: AArrowDown,
  md: ALargeSmall,
  lg: Type,
  xl: AArrowUp,
};

const THEME_CHOICE_ICONS: Record<ThemeChoice, typeof Type> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
  oled: Layers,
  glassy: Sparkles,
};

const Swatches = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
}) as typeof Box;

// SVG flags scale crisply at the small icon size — emoji-based `🇬🇧` rendered
// inconsistently across Windows (no native colour-emoji font for region flags).
const LocaleFlag = styled(ReactCountryFlag)({
  marginRight: 8,
  width: 16,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  display: "inline-block",
});

interface SwatchProps {
  color: string;
  active?: boolean;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const Swatch = styled("button", {
  shouldForwardProp: (p) => p !== "color" && p !== "active",
})<SwatchProps>(({ theme, color, active }) => ({
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: color,
  border: 0,
  cursor: "pointer",
  padding: 0,
  outline: active ? `2px solid ${theme.palette.text.primary}` : "none",
  outlineOffset: 2,
  transition: "outline-color 0.15s ease",
  "&:hover": { outline: `2px solid ${theme.palette.text.secondary}`, outlineOffset: 2 },
}));

const ThemeSelect = styled(SelectControl)({ minWidth: 200 });
const FontSelect = styled(SelectControl)({ minWidth: 220 });
const FontSizeSelect = styled(SelectControl)({ minWidth: 180 });

const MenuLabel = styled(Box)(({ theme }) => ({
  display: "inline-block",
  marginLeft: theme.spacing(1),
}));

// eslint-disable-next-line no-restricted-syntax -- semantic <li> inside MUI Select listbox; Box would break a11y
const FontGroupLabel = styled("li", {
  shouldForwardProp: (p) => p !== "withDivider",
})<{ withDivider?: boolean }>(({ theme, withDivider }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  pointerEvents: "none",
  listStyle: "none",
  borderTop: withDivider ? `1px solid ${theme.palette.divider}` : undefined,
  marginTop: withDivider ? theme.spacing(0.5) : undefined,
}));

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const primaryColor = useAppSelector((s) => s.settings.primaryColor);
  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const themeChoice: ThemeChoice = followsSystem ? "system" : themeId;
  const font = useAppSelector((s) => s.settings.font);
  const codeFont = useAppSelector((s) => s.settings.codeFont);
  const codeLigatures = useAppSelector((s) => s.settings.codeLigatures);
  const fontSize = useAppSelector((s) => s.settings.fontSize);
  const customFonts = useAppSelector((s) => s.settings.customFonts);

  const onThemeChoice = (choice: ThemeChoice) => {
    if (choice === "system") {
      dispatch(setFollowsSystem(true));
    } else {
      dispatch(setThemeId(choice));
    }
  };

  const currentAccent = SCHEME_TO_ACCENT[primaryColor];

  return (
    <SettingsSection title={t("settings.general.appearance")}>
      <SettingsRow label={t("settings.fields.theme")} sub={t("settings.fields.theme_sub")}>
        <ThemeSelect
          size="small"
          value={themeChoice}
          onChange={(e: SelectChangeEvent<unknown>) => onThemeChoice(e.target.value as ThemeChoice)}
          slotProps={{ input: { "aria-label": t("settings.fields.theme") } }}
          data-testid={TEST_IDS.settings.general.themeSelect}
          renderValue={(value) => {
            const c = value as ThemeChoice;
            const Icon = THEME_CHOICE_ICONS[c];
            return (
              <>
                <Icon size={13} />
                {themeChoiceLabel(c)}
              </>
            );
          }}
        >
          {THEME_CHOICES.map((c) => {
            const Icon = THEME_CHOICE_ICONS[c];
            return (
              <MenuItem key={c} value={c}>
                <Icon size={13} />
                <MenuLabel>{themeChoiceLabel(c)}</MenuLabel>
              </MenuItem>
            );
          })}
        </ThemeSelect>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.language")} sub={t("settings.fields.language_sub")}>
        <SelectControl
          size="small"
          value={i18n.language.split("-")[0] ?? "en"}
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

      <SettingsRow label={t("settings.fields.accent")} sub={t("settings.fields.accent_sub")}>
        <Swatches data-testid={TEST_IDS.settings.general.accentSwatches}>
          {ACCENT_IDS.map((id) => {
            const scheme = ACCENT_SCHEME_MAP[id];
            const accentLabel = t(`accent.${id}`, { ns: I18nNamespace.SETTINGS });
            return (
              <GeneralTooltip key={id} title={accentLabel} arrow placement="top">
                <Swatch
                  type="button"
                  color={PRIMARY_COLOR_SCHEMES[scheme].MAIN}
                  active={currentAccent === id}
                  aria-label={t("settings.theme_swatch", {
                    ns: I18nNamespace.ARIA,
                    label: accentLabel,
                  })}
                  aria-pressed={currentAccent === id}
                  data-testid={TEST_IDS.settings.general.accentChip(id)}
                  onClick={() => dispatch(setPrimaryColor(scheme))}
                />
              </GeneralTooltip>
            );
          })}
        </Swatches>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.font")} sub={t("settings.fields.font_sub")}>
        <FontSelect
          size="small"
          value={font}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFont(e.target.value as FontSelection))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.font") } }}
          data-testid={TEST_IDS.settings.general.fontSelect}
          renderValue={(value) => (
            <Box component="span" style={{ fontFamily: fontCssFamily(value as FontSelection) }}>
              {fontLabel(value as FontSelection)}
            </Box>
          )}
        >
          <FontGroupLabel>{t("font_groups.sans", { ns: I18nNamespace.SETTINGS })}</FontGroupLabel>
          {SANS_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.fontOption(f)}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {fontLabel(f)}
              </Box>
            </MenuItem>
          ))}
          <FontGroupLabel withDivider>
            {t("font_groups.monospace", { ns: I18nNamespace.SETTINGS })}
          </FontGroupLabel>
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.fontOption(f)}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {fontLabel(f)}
              </Box>
            </MenuItem>
          ))}
          {customFonts.length > 0 && (
            <FontGroupLabel withDivider>
              {t("font_groups.custom", { ns: I18nNamespace.SETTINGS })}
            </FontGroupLabel>
          )}
          {customFonts.map((cf) => {
            const value = `${CUSTOM_FONT_PREFIX}${cf.family}`;
            return (
              <MenuItem
                key={value}
                value={value}
                data-testid={TEST_IDS.settings.general.fontOption(value)}
              >
                <Box component="span" style={{ fontFamily: fontCssFamily(value) }}>
                  {cf.family}
                </Box>
              </MenuItem>
            );
          })}
        </FontSelect>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.code_font")} sub={t("settings.fields.code_font_sub")}>
        <FontSelect
          size="small"
          value={codeFont}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setCodeFont(e.target.value as FontSelection))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.code_font") } }}
          data-testid={TEST_IDS.settings.general.codeFontSelect}
          renderValue={(value) => (
            <Box
              component="span"
              style={{
                fontFamily: fontCssFamily(value as FontSelection, "mono"),
                fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
              }}
            >
              {fontLabel(value as FontSelection)}
            </Box>
          )}
        >
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.codeFontOption(f)}>
              <Box
                component="span"
                style={{
                  fontFamily: fontCssFamily(f, "mono"),
                  fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
                }}
              >
                {fontLabel(f)} &nbsp; =&gt; != &gt;=
              </Box>
            </MenuItem>
          ))}
          {customFonts.length > 0 && (
            <FontGroupLabel withDivider>
              {t("font_groups.custom", { ns: I18nNamespace.SETTINGS })}
            </FontGroupLabel>
          )}
          {customFonts.map((cf) => {
            const value = `${CUSTOM_FONT_PREFIX}${cf.family}`;
            return (
              <MenuItem
                key={value}
                value={value}
                data-testid={TEST_IDS.settings.general.codeFontOption(value)}
              >
                <Box
                  component="span"
                  style={{
                    fontFamily: fontCssFamily(value, "mono"),
                    fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
                  }}
                >
                  {cf.family} &nbsp; =&gt; != &gt;=
                </Box>
              </MenuItem>
            );
          })}
        </FontSelect>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.code_ligatures")}
        sub={t("settings.fields.code_ligatures_sub")}
      >
        <FontSelect
          size="small"
          value={codeLigatures}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setCodeLigatures(e.target.value as LigatureMode))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.code_ligatures") } }}
          data-testid={TEST_IDS.settings.general.codeLigaturesSelect}
          renderValue={(value) => {
            const mode = value as LigatureMode;
            return (
              <Box
                component="span"
                style={{
                  fontFamily: fontCssFamily(codeFont, "mono"),
                  fontFeatureSettings: codeLigatureFeatureSettings(mode),
                }}
              >
                {LIGATURE_MODE_LABELS[mode]}
              </Box>
            );
          }}
        >
          {LIGATURE_MODE_IDS.map((mode) => (
            <MenuItem
              key={mode}
              value={mode}
              data-testid={TEST_IDS.settings.general.codeLigaturesOption(mode)}
            >
              <Box
                component="span"
                style={{
                  fontFamily: fontCssFamily(codeFont, "mono"),
                  fontFeatureSettings: codeLigatureFeatureSettings(mode),
                }}
              >
                {LIGATURE_MODE_LABELS[mode]} &nbsp; =&gt; != &gt;= -&gt; ===
              </Box>
            </MenuItem>
          ))}
        </FontSelect>
      </SettingsRow>

      <CustomFontRow />

      <SettingsRow label={t("settings.fields.font_size")} sub={t("settings.fields.font_size_sub")}>
        <FontSizeSelect
          size="small"
          value={fontSize}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFontSize(e.target.value as FontSizeId))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.font_size") } }}
          data-testid={TEST_IDS.settings.general.fontSizeSelect}
          renderValue={(value) => {
            const Icon = FONT_SIZE_ICONS[value as FontSizeId];
            return (
              <>
                <Icon size={13} />
                {fontSizeLabel(value as FontSizeId)}
              </>
            );
          }}
        >
          {FONT_SIZE_IDS.map((sz) => {
            const Icon = FONT_SIZE_ICONS[sz];
            return (
              <MenuItem key={sz} value={sz}>
                <Icon size={13} />
                <MenuLabel>{fontSizeLabel(sz)}</MenuLabel>
              </MenuItem>
            );
          })}
        </FontSizeSelect>
      </SettingsRow>
    </SettingsSection>
  );
}

export default AppearanceSection;
