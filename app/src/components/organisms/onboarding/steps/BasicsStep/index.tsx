import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";

import { MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Monitor, Moon, Sun } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import {
  StepBody,
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
  Tile,
  TileLabel,
  TileLeft,
  TileRight,
  TileStack,
  TileSub,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { type ThemeId } from "@/lib/constants/theme.constants";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import {
  followSystemTheme,
  setCrashReporting,
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setLocale,
  setNotificationsEnabled,
  setThemeId,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface BasicsStepProps {
  onBack: () => void;
  onNext: () => void;
}

type ThemeChoice = "system" | "light" | "dark";

// Translucency lives in Settings now, so the wizard stays simple — just
// the canonical three picks.
const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark"];

const THEME_ICONS: Record<ThemeChoice, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

interface LocaleEntry {
  code: string;
  label: string;
  countryCode: string;
}

const LOCALES: LocaleEntry[] = [
  { code: "en", label: "English", countryCode: "GB" },
  { code: "de", label: "Deutsch", countryCode: "DE" },
];

const LocaleFlag = styled(ReactCountryFlag)({
  marginRight: 8,
  width: 16,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  display: "inline-block",
});

function themeLabel(choice: ThemeChoice, t: (key: string) => string): string {
  switch (choice) {
    case "system":
      return t("basics.theme_system");
    case "light":
      return t("basics.theme_light");
    case "dark":
      return t("basics.theme_dark");
  }
}

function BasicsStep({ onBack, onNext }: BasicsStepProps) {
  const { t, i18n } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();

  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const themeChoice: ThemeChoice = followsSystem ? "system" : themeId;
  const autoStart = useAppSelector((s) => s.settings.desktop.autoStart);
  const closeToTray = useAppSelector((s) => s.settings.desktop.closeToTray);
  const notifEnabled = useAppSelector((s) => s.settings.notifications.enabled);
  const crashReports = useAppSelector((s) => s.settings.backend?.crashReporting ?? false);

  const onThemeChoice = (choice: ThemeChoice) => {
    if (choice === "system") void dispatch(followSystemTheme());
    else dispatch(setThemeId(choice as ThemeId));
  };

  const onLocaleChoice = (code: string) => {
    void i18n.changeLanguage(code);
    dispatch(setLocale(code));
  };

  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.BASICS)}>
      <StepHead>
        <StepTitle component="h1">{t("basics.title")}</StepTitle>
        <StepBody component="p">{t("basics.body")}</StepBody>
      </StepHead>
      <StepContent>
        <TileStack>
          <Tile>
            <TileLeft>
              <TileLabel>{t("basics.theme")}</TileLabel>
              <TileSub>{t("basics.theme_desc")}</TileSub>
            </TileLeft>
            <TileRight>
              <SelectControl
                size="small"
                value={themeChoice}
                onChange={(e: SelectChangeEvent<unknown>) =>
                  onThemeChoice(e.target.value as ThemeChoice)
                }
                renderValue={(value) => {
                  const c = value as ThemeChoice;
                  const Icon = THEME_ICONS[c];
                  return (
                    <>
                      <Icon size={13} />
                      {themeLabel(c, t)}
                    </>
                  );
                }}
              >
                {THEME_CHOICES.map((c) => {
                  const Icon = THEME_ICONS[c];
                  return (
                    <MenuItem key={c} value={c}>
                      <Icon size={13} style={{ marginRight: 8 }} />
                      {themeLabel(c, t)}
                    </MenuItem>
                  );
                })}
              </SelectControl>
            </TileRight>
          </Tile>

          <Tile>
            <TileLeft>
              <TileLabel>{t("basics.language")}</TileLabel>
              <TileSub>{t("basics.language_desc")}</TileSub>
            </TileLeft>
            <TileRight>
              <SelectControl
                size="small"
                value={i18n.language.split("-")[0] ?? "en"}
                onChange={(e: SelectChangeEvent<unknown>) =>
                  onLocaleChoice(e.target.value as string)
                }
              >
                {LOCALES.map((l) => (
                  <MenuItem key={l.code} value={l.code}>
                    <LocaleFlag countryCode={l.countryCode} svg aria-hidden />
                    {l.label}
                  </MenuItem>
                ))}
              </SelectControl>
            </TileRight>
          </Tile>

          <Tile>
            <TileLeft>
              <TileLabel>{t("basics.auto_start")}</TileLabel>
              <TileSub>{t("basics.auto_start_desc")}</TileSub>
            </TileLeft>
            <TileRight>
              <GeneralSwitchInput
                checked={autoStart}
                onCheckedChange={(v) => dispatch(setDesktopAutoStart(v))}
              />
            </TileRight>
          </Tile>

          <Tile>
            <TileLeft>
              <TileLabel>{t("basics.close_to_tray")}</TileLabel>
              <TileSub>{t("basics.close_to_tray_desc")}</TileSub>
            </TileLeft>
            <TileRight>
              <GeneralSwitchInput
                checked={closeToTray}
                onCheckedChange={(v) => dispatch(setDesktopCloseToTray(v))}
              />
            </TileRight>
          </Tile>

          <Tile>
            <TileLeft>
              <TileLabel>{t("basics.notifications")}</TileLabel>
              <TileSub>{t("basics.notifications_desc")}</TileSub>
            </TileLeft>
            <TileRight>
              <GeneralSwitchInput
                checked={notifEnabled}
                onCheckedChange={(v) => dispatch(setNotificationsEnabled(v))}
              />
            </TileRight>
          </Tile>

          <Tile>
            <TileLeft>
              <TileLabel>{t("crashReports.label")}</TileLabel>
              <TileSub>{t("crashReports.hint")}</TileSub>
            </TileLeft>
            <TileRight>
              <GeneralSwitchInput
                checked={crashReports}
                onCheckedChange={(v) => dispatch(setCrashReporting(v))}
                data-testid={TEST_IDS.onboarding.crashReportsToggle}
              />
            </TileRight>
          </Tile>
        </TileStack>
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          data-testid={TEST_IDS.onboarding.basicsBack}
        >
          {t("welcome.back")}
        </GeneralButton>
        <GeneralButton onClick={onNext} data-testid={TEST_IDS.onboarding.basicsNext}>
          {t("basics.next")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default BasicsStep;
