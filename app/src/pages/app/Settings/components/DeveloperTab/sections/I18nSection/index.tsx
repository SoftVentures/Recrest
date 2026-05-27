import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { clearMissingI18nKeys, getMissingI18nKeys } from "@/locales";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function I18nSection() {
  const { i18n } = useTranslation();
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
      toast.info("No missing translations recorded yet");
      return;
    }
    try {
      await navigator.clipboard?.writeText(JSON.stringify(keys, null, 2));
      toast.success(`Copied ${keys.length} missing key${keys.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const clearMissing = () => {
    clearMissingI18nKeys();
    toast.success("Missing-key list cleared");
  };

  return (
    <SettingsSection title="i18n" testId={TEST_IDS.settings.developer.sections.i18n}>
      <SettingsRow
        label="Highlight missing translations"
        sub="Underline strings that fall through to the default value."
      >
        <GeneralSwitchInput
          checked={highlight}
          onCheckedChange={setHighlight}
          data-testid={TEST_IDS.settings.developer.i18n.highlightSwitch}
        />
      </SettingsRow>
      <SettingsRow label="Copy missing keys">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.copyMissing}
            onClick={() => void copyMissing()}
          >
            Copy
          </GeneralButton>
          <GeneralButton size="sm" variant="ghost" onClick={clearMissing}>
            Clear
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Switch locale">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.localeEn}
            onClick={() => void i18n.changeLanguage("en")}
          >
            English
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.i18n.localeDe}
            onClick={() => void i18n.changeLanguage("de")}
          >
            Deutsch
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

export default I18nSection;
