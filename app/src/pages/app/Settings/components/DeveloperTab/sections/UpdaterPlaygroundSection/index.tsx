import { useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { StorageKey } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
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
  const dispatch = useAppDispatch();
  const [forceFallback, setForceFallback] = useState(false);
  const [simVersion, setSimVersion] = useState("99.99.99");
  const [simCanAutoInstall, setSimCanAutoInstall] = useState(true);
  const [endpointOverride, setEndpointOverride] = useState("");

  const forceCheck = async () => {
    await safeInvoke(TauriCommand.CHECK_FOR_UPDATE, {
      autoInstall: false,
      forceFallback,
      endpointOverride: endpointOverride.trim() || null,
    });
    toast.info("Checking for updates…");
  };

  const emit = () => {
    dispatch(
      setUpdaterBanner({
        version: simVersion.trim() || "99.99.99",
        currentVersion: "dev",
        body: "Simulated event",
        canAutoInstall: simCanAutoInstall,
        downloadUrl: simCanAutoInstall ? null : "https://example.com/download",
      }),
    );
    toast.success("Updater banner emitted");
  };

  const resetLastSeen = () => {
    try {
      localStorage.removeItem(StorageKey.LAST_SEEN_VERSION);
    } catch {
      /* ignore */
    }
    toast.success("Last-seen version reset");
  };

  return (
    <SettingsSection
      title="Updater playground"
      testId={TEST_IDS.settings.developer.sections.updater}
    >
      <SettingsRow label="Force check now">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.updater.forceCheck}
          onClick={() => void forceCheck()}
        >
          Force check
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label="Force download fallback"
        sub="Treat the auto-installer path as broken — surface the manual download link instead."
      >
        <GeneralSwitchInput
          checked={forceFallback}
          onCheckedChange={setForceFallback}
          data-testid={TEST_IDS.settings.developer.updater.forceFallback}
        />
      </SettingsRow>
      <SettingsRow label="Endpoint override">
        <TextInput
          type="text"
          placeholder="https://updates.example.com/manifest.json"
          value={endpointOverride}
          onChange={(e) => setEndpointOverride(e.target.value)}
          style={{ minWidth: 260 }}
          data-testid={TEST_IDS.settings.developer.updater.endpointOverride}
        />
      </SettingsRow>
      <SettingsRow label="Simulate update event">
        <ButtonRow>
          <TextInput
            type="text"
            value={simVersion}
            onChange={(e) => setSimVersion(e.target.value)}
            placeholder="99.99.99"
            style={{ width: 120 }}
            data-testid={TEST_IDS.settings.developer.updater.simVersion}
          />
          <InlineLabel component="span" variant="caption">
            <GeneralSwitchInput
              checked={simCanAutoInstall}
              onCheckedChange={setSimCanAutoInstall}
              data-testid={TEST_IDS.settings.developer.updater.simCanAutoInstall}
            />
            canAutoInstall
          </InlineLabel>
          <GeneralButton
            size="sm"
            variant="outline"
            onClick={emit}
            data-testid={TEST_IDS.settings.developer.updater.emit}
          >
            Emit
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow
        label="Reset last-seen version"
        sub="Make the update banner appear again for the current version."
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.updater.resetLastSeen}
          onClick={resetLastSeen}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default UpdaterPlaygroundSection;
