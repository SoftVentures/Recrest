import { useState } from "react";

import { useTranslation } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { STORAGE_PREFIX } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { safeInvoke } from "@/lib/tauri";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function FactoryResetSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const [running, setRunning] = useState(false);
  // Confirm via the app's modal, not `window.confirm` — the latter is rerouted
  // to the Tauri dialog plugin (ACL-gated, async) in the desktop shell and
  // throws "dialog.confirm not allowed" there.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runReset = async () => {
    setConfirmOpen(false);
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
      toast.success(t("developer.factoryReset.done"));
      setTimeout(() => window.location.reload(), 250);
    } finally {
      setRunning(false);
    }
  };

  return (
    <SettingsSection
      title={t("developer.sections.factory_reset")}
      testId={TEST_IDS.settings.developer.sections.factoryReset}
    >
      <SettingsRow
        label={t("developer.factoryReset.title")}
        sub={t("developer.factoryReset.row_sub")}
      >
        <GeneralButton
          size="sm"
          variant="destructive"
          data-testid={TEST_IDS.settings.developer.factoryResetButton}
          disabled={running}
          onClick={() => setConfirmOpen(true)}
        >
          {t("developer.factoryReset.button")}
        </GeneralButton>
      </SettingsRow>

      <ConfirmationModal
        open={confirmOpen}
        title={t("developer.factoryReset.confirmTitle")}
        description={t("developer.factoryReset.confirmBody")}
        confirmLabel={t("developer.factoryReset.button")}
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void runReset()}
      />
    </SettingsSection>
  );
}

export default FactoryResetSection;
