import { useState } from "react";

import { useTranslation } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { INSTALL_CHANNEL } from "@/lib/constants/updater.constants";
import { safeInvoke } from "@/lib/tauri";
import {
  ButtonRow,
  InlineLabel,
  TextInput,
} from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setUpdaterBanner } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export function UpdaterPlaygroundSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const dispatch = useAppDispatch();
  const [forceFallback, setForceFallback] = useState(false);
  const [simVersion, setSimVersion] = useState("99.99.99"); // audit:ignore-fact — dev-only simulated remote version placeholder
  const [simCanAutoInstall, setSimCanAutoInstall] = useState(true);
  const [simPackageManaged, setSimPackageManaged] = useState(false);
  const [endpointOverride, setEndpointOverride] = useState("");

  const forceCheck = async () => {
    // The command binds a single `args` parameter, so the options have to be nested.
    // Passing them flat silently dropped them and always ran a plain default check.
    await safeInvoke(TauriCommand.CHECK_FOR_UPDATE, {
      args: {
        autoInstall: false,
        forceFallback,
        endpointOverride: endpointOverride.trim() || null,
      },
    });
    toast.info(t("developer.updater.checking"));
  };

  const emit = () => {
    dispatch(
      setUpdaterBanner({
        version: simVersion.trim() || "99.99.99", // audit:ignore-fact — dev-only simulated remote version placeholder
        currentVersion: "dev",
        body: t("developer.updater.simulated_body"),
        canAutoInstall: simCanAutoInstall,
        // Stands in for a real distro install so the package-manager hint can be
        // exercised on any dev machine, not just on Arch or Fedora.
        installChannel: simPackageManaged ? INSTALL_CHANNEL.SYSTEM_PACKAGE : null,
        downloadUrl: simCanAutoInstall ? null : "https://example.com/download",
      }),
    );
    toast.success(t("developer.updater.banner_emitted"));
  };

  const resetLastSeen = () => {
    try {
      localStorage.removeItem(StorageKey.LAST_SEEN_VERSION);
    } catch {
      /* ignore */
    }
    toast.success(t("developer.updater.reset_last_seen_done"));
  };

  return (
    <SettingsSection
      title={t("developer.sections.updater_playground")}
      testId={TEST_IDS.settings.developer.sections.updater}
    >
      <SettingsRow label={t("developer.updater.force_check")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.updater.forceCheck}
          onClick={() => void forceCheck()}
        >
          {t("developer.updater.force_check_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label={t("developer.updater.force_fallback")}
        sub={t("developer.updater.force_fallback_sub")}
      >
        <GeneralSwitchInput
          checked={forceFallback}
          onCheckedChange={setForceFallback}
          data-testid={TEST_IDS.settings.developer.updater.forceFallback}
        />
      </SettingsRow>
      <SettingsRow label={t("developer.updater.endpoint_override")}>
        <TextInput
          type="text"
          placeholder={t("developer.updater.endpoint_override_input_placeholder")}
          value={endpointOverride}
          onChange={(e) => setEndpointOverride(e.target.value)}
          style={{ minWidth: 260 }}
          data-testid={TEST_IDS.settings.developer.updater.endpointOverride}
        />
      </SettingsRow>
      <SettingsRow label={t("developer.updater.simulate")}>
        <ButtonRow>
          <TextInput
            type="text"
            value={simVersion}
            onChange={(e) => setSimVersion(e.target.value)}
            placeholder={
              // audit:ignore-fact — dev-only simulated remote version placeholder
              "99.99.99"
            }
            style={{ width: 120 }}
            data-testid={TEST_IDS.settings.developer.updater.simVersion}
          />
          <InlineLabel component="span" variant="caption">
            <GeneralSwitchInput
              checked={simCanAutoInstall}
              onCheckedChange={setSimCanAutoInstall}
              data-testid={TEST_IDS.settings.developer.updater.simCanAutoInstall}
            />
            {t("developer.updater.can_auto_install")}
          </InlineLabel>
          <InlineLabel component="span" variant="caption">
            <GeneralSwitchInput
              checked={simPackageManaged}
              onCheckedChange={setSimPackageManaged}
              data-testid={TEST_IDS.settings.developer.updater.simPackageManaged}
            />
            {t("developer.updater.package_managed")}
          </InlineLabel>
          <GeneralButton
            size="sm"
            variant="outline"
            onClick={emit}
            data-testid={TEST_IDS.settings.developer.updater.emit}
          >
            {t("developer.updater.simulate_emit")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow
        label={t("developer.updater.reset_last_seen")}
        sub={t("developer.updater.reset_last_seen_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.updater.resetLastSeen}
          onClick={resetLastSeen}
        >
          {t("developer.updater.reset_button")}
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default UpdaterPlaygroundSection;
