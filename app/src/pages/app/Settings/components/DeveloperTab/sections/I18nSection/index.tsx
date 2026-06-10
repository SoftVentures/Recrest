import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { clearMissingI18nKeys, getMissingI18nKeys } from "@/locales";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function I18nSection() {
  const { t, i18n } = useTranslation(I18nNamespace.SETTINGS);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    try {
      document.documentElement.dataset.i18nHighlight = highlight ? "true" : "";
    } catch {
      /* ignore */
    }
  }, [highlight]);

  const copyMissing = async () => {
    const keys = getMissingI18nKeys();
    if (keys.length === 0) {
      toast.info(t("developer.i18n.copy_missing_empty"));
      return;
    }
    try {
      await navigator.clipboard?.writeText(JSON.stringify(keys, null, 2));
      toast.success(t("developer.i18n.copy_missing_count", { count: keys.length }));
    } catch {
      toast.error(t("developer.i18n.copy_failed"));
    }
  };

  const clearMissing = () => {
    clearMissingI18nKeys();
    toast.success(t("developer.i18n.cleared"));
  };

  return (
    <SettingsSection
      title={t("developer.sections.i18n")}
      testId={TEST_IDS.settings.developer.sections.i18n}
    >
      <SettingsRow
        label={t("developer.i18n.highlight_missing")}
        sub={t("developer.i18n.highlight_missing_sub")}
      >
        <GeneralSwitchInput
          checked={highlight}
          onCheckedChange={setHighlight}
          data-testid={TEST_IDS.settings.developer.i18n.highlightSwitch}
        />
      </SettingsRow>
      <SettingsRow label={t("developer.i18n.copy_missing")}>
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.copyMissing}
            onClick={() => void copyMissing()}
          >
            {t("developer.build.copy")}
          </GeneralButton>
          <GeneralButton size="sm" variant="ghost" onClick={clearMissing}>
            {t("developer.i18n.clear")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label={t("developer.i18n.switch_locale")}>
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.localeEn}
            onClick={() => void i18n.changeLanguage("en")}
          >
            {t("developer.i18n.locale_en")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.localeDe}
            onClick={() => void i18n.changeLanguage("de")}
          >
            {t("developer.i18n.locale_de")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

export default I18nSection;
