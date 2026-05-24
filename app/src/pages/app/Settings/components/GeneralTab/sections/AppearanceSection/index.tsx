import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  type AccentId,
  FONT_LABELS,
  type FontId,
  type FontSizeId,
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
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { PRIMARY_COLOR_SCHEMES, type PrimaryColorScheme } from "@/lib/constants/theme.constants";
import {
  type ThemeChoice,
  fontCssFamily,
  fontSizeLabel,
  themeChoiceLabel,
} from "@/lib/utils/appearance.utils";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
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
const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark", "oled", "glassy"];

const LOCALES: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
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

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const primaryColor = useAppSelector((s) => s.settings.primaryColor);
  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const themeChoice: ThemeChoice = followsSystem ? "system" : themeId;
  const font = useAppSelector((s) => s.settings.font);
  const fontSize = useAppSelector((s) => s.settings.fontSize);

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
        <SelectControl
          size="small"
          value={themeChoice}
          onChange={(e: SelectChangeEvent<unknown>) => onThemeChoice(e.target.value as ThemeChoice)}
          data-testid={TEST_IDS.settings.general.themeSelect}
          sx={{ minWidth: 200 }}
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
                <Box component="span" sx={{ ml: 1 }}>
                  {themeChoiceLabel(c)}
                </Box>
              </MenuItem>
            );
          })}
        </SelectControl>
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
          data-testid={TEST_IDS.settings.general.localeSelect}
        >
          {LOCALES.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              <Box component="span" sx={{ mr: 1 }}>
                {l.flag}
              </Box>
              {l.label}
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.accent")} sub={t("settings.fields.accent_sub")}>
        <Swatches data-testid={TEST_IDS.settings.general.accentSwatches}>
          {ACCENT_IDS.map((id) => {
            const scheme = ACCENT_SCHEME_MAP[id];
            return (
              <GeneralTooltip key={id} title={id} arrow placement="top">
                <Swatch
                  type="button"
                  color={PRIMARY_COLOR_SCHEMES[scheme].MAIN}
                  active={currentAccent === id}
                  aria-label={id}
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
        <SelectControl
          size="small"
          value={font}
          onChange={(e: SelectChangeEvent<unknown>) => dispatch(setFont(e.target.value as FontId))}
          sx={{ minWidth: 220 }}
          data-testid={TEST_IDS.settings.general.fontSelect}
          renderValue={(value) => (
            <Box component="span" style={{ fontFamily: fontCssFamily(value as FontId) }}>
              {FONT_LABELS[value as FontId]}
            </Box>
          )}
        >
          <Box
            component="li"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "text.information",
              px: 2,
              py: 1,
              pointerEvents: "none",
            }}
          >
            Sans
          </Box>
          {SANS_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {FONT_LABELS[f]}
              </Box>
            </MenuItem>
          ))}
          <Box
            component="li"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "text.information",
              px: 2,
              py: 1,
              pointerEvents: "none",
              borderTop: (th) => `1px solid ${th.palette.divider}`,
              mt: 0.5,
            }}
          >
            Monospace
          </Box>
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {FONT_LABELS[f]}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.font_size")} sub={t("settings.fields.font_size_sub")}>
        <SelectControl
          size="small"
          value={fontSize}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFontSize(e.target.value as FontSizeId))
          }
          sx={{ minWidth: 180 }}
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
                <Box component="span" sx={{ ml: 1 }}>
                  {fontSizeLabel(sz)}
                </Box>
              </MenuItem>
            );
          })}
        </SelectControl>
      </SettingsRow>
    </SettingsSection>
  );
}

export default AppearanceSection;
