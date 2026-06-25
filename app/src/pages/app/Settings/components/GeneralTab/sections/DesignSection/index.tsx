import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type AccentId } from "@recrest/shared";

import { Monitor, Moon, Sun, Type } from "lucide-react";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import IntensitySlider from "@/components/atoms/inputs/IntensitySlider";
import { useTranslucencySupport } from "@/hooks/useTranslucencySupport";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { PRIMARY_COLOR_SCHEMES, type PrimaryColorScheme } from "@/lib/constants/theme.constants";
import { type ThemeChoice, themeChoiceLabel } from "@/lib/utils/appearance.utils";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  followSystemTheme,
  setPrimaryColor,
  setThemeId,
  setTranslucencyEnabled,
  setTranslucencyIntensity,
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
const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark"];

const THEME_CHOICE_ICONS: Record<ThemeChoice, typeof Type> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
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

// eslint-disable-next-line no-restricted-syntax -- native <button> required for accessibility
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

const TranslucencyHint = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
}));

const ThemeSelect = styled(SelectControl)({ minWidth: 200 });

const MenuLabel = styled(Box)(({ theme }) => ({
  display: "inline-block",
  marginLeft: theme.spacing(1),
}));

export function DesignSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const primaryColor = useAppSelector((s) => s.settings.primaryColor);
  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const themeChoice: ThemeChoice = followsSystem ? "system" : themeId;
  const translucencyEnabled = useAppSelector((s) => s.settings.translucency.enabled);
  const translucencyIntensity = useAppSelector((s) => s.settings.translucency.intensity);
  const supportsTranslucency = useTranslucencySupport();

  const onThemeChoice = (choice: ThemeChoice) => {
    if (choice === "system") {
      void dispatch(followSystemTheme());
    } else {
      dispatch(setThemeId(choice));
    }
  };

  const currentAccent = SCHEME_TO_ACCENT[primaryColor];

  return (
    <SettingsSection title={t("settings.sections.design")}>
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
                {themeChoiceLabel(c, t)}
              </>
            );
          }}
        >
          {THEME_CHOICES.map((c) => {
            const Icon = THEME_CHOICE_ICONS[c];
            return (
              <MenuItem key={c} value={c}>
                <Icon size={13} />
                <MenuLabel>{themeChoiceLabel(c, t)}</MenuLabel>
              </MenuItem>
            );
          })}
        </ThemeSelect>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.translucency")}
        sub={t("settings.fields.translucency_sub")}
      >
        {supportsTranslucency ? (
          <GeneralSwitchInput
            checked={translucencyEnabled}
            onCheckedChange={(v) => dispatch(setTranslucencyEnabled(v))}
            data-testid={TEST_IDS.settings.general.translucencyToggle}
          />
        ) : (
          <TranslucencyHint>{t("settings.fields.translucency_unsupported")}</TranslucencyHint>
        )}
      </SettingsRow>

      {supportsTranslucency && translucencyEnabled && (
        <SettingsRow
          label={t("settings.fields.translucency_intensity")}
          sub={t("settings.fields.translucency_intensity_sub")}
        >
          {/* Windows-Terminal model: the slider is "background opacity" (higher =
              more solid). The store keeps `intensity` as the inverse
              (transparency strength, what the CSS rgba alpha consumes), so we
              flip it at the UI boundary only — store/CSS/macOS stay untouched. */}
          <IntensitySlider
            value={100 - translucencyIntensity}
            onChange={(v) => dispatch(setTranslucencyIntensity(100 - v))}
            ariaLabel={t("settings.fields.translucency_intensity")}
            dataTestId={TEST_IDS.settings.general.translucencyIntensitySlider}
            formatValue={(n) => `${n}%`}
          />
        </SettingsRow>
      )}

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
    </SettingsSection>
  );
}

export default DesignSection;
