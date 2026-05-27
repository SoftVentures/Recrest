import { useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { STORAGE_PREFIX } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { safeInvoke } from "@/lib/tauri";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function FactoryResetSection() {
  const [running, setRunning] = useState(false);

  const runReset = async () => {
    if (
      !window.confirm(
        "Reset Recrest to factory defaults? This wipes settings, tokens, localStorage, and re-runs onboarding. The page will reload.",
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      try {
        await safeInvoke(TauriCommand.FACTORY_RESET);
      } catch (err) {
        console.warn("[factory-reset] backend reset failed", err);
      }
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
        }
      } catch {
        /* ignore */
      }
      toast.success("Factory reset complete. Reloading…");
      setTimeout(() => window.location.reload(), 250);
    } finally {
      setRunning(false);
    }
  };

  return (
    <SettingsSection
      title="Factory reset"
      testId={TEST_IDS.settings.developer.sections.factoryReset}
    >
      <SettingsRow
        label="Reset to factory defaults"
        sub="Wipes settings, tokens, localStorage, and re-runs onboarding."
      >
        <GeneralButton
          size="sm"
          variant="destructive"
          data-testid={TEST_IDS.settings.developer.factoryResetButton}
          disabled={running}
          onClick={() => void runReset()}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default FactoryResetSection;
