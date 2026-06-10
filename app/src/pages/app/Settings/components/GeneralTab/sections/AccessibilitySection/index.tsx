import { useTranslation } from "react-i18next";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setHighContrast,
  setReducedMotion,
  setUnderlineLinks,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function AccessibilitySection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);

  return (
    <SettingsSection title={t("settings.accessibility.title")}>
      <SettingsRow
        label={t("settings.accessibility.high_contrast")}
        sub={t("settings.accessibility.high_contrast_sub")}
      >
        <GeneralSwitchInput
          checked={highContrast}
          onCheckedChange={(v) => dispatch(setHighContrast(v))}
          aria-label={t("settings.accessibility.high_contrast")}
          data-testid={TEST_IDS.settings.general.a11yHighContrast}
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.accessibility.reduced_motion")}
        sub={t("settings.accessibility.reduced_motion_sub")}
      >
        <GeneralSwitchInput
          checked={reducedMotion}
          onCheckedChange={(v) => dispatch(setReducedMotion(v))}
          aria-label={t("settings.accessibility.reduced_motion")}
          data-testid={TEST_IDS.settings.general.a11yReducedMotion}
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.accessibility.underline_links")}
        sub={t("settings.accessibility.underline_links_sub")}
      >
        <GeneralSwitchInput
          checked={underlineLinks}
          onCheckedChange={(v) => dispatch(setUnderlineLinks(v))}
          aria-label={t("settings.accessibility.underline_links")}
          data-testid={TEST_IDS.settings.general.a11yUnderlineLinks}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export default AccessibilitySection;
