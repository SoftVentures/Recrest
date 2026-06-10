import { useState } from "react";

import { useTranslation } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { safeInvoke, toggleWebviewDevtools } from "@/lib/tauri";
import { setIpcTrace } from "@/lib/tauri/ipcTrace";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function IpcSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const [ipcTrace, setIpcTraceState] = useState(false);

  const onToggleIpcTrace = (next: boolean) => {
    setIpcTraceState(next);
    setIpcTrace(next);
  };

  const rendererCrash = () => {
    setTimeout(() => {
      throw new Error("dev-forced renderer crash");
    }, 0);
  };

  const rustPanic = async () => {
    await safeInvoke(TauriCommand.DEV_PANIC);
  };

  return (
    <SettingsSection
      title={t("developer.sections.ipc")}
      testId={TEST_IDS.settings.developer.sections.ipc}
    >
      <SettingsRow
        label={t("developer.ipc.toggle_devtools")}
        sub={t("developer.ipc.toggle_devtools_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.toggleDevtools}
          onClick={() => void toggleWebviewDevtools()}
        >
          {t("developer.ipc.toggle_devtools")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.ipc.trace_calls")} sub={t("developer.ipc.trace_calls_sub")}>
        <GeneralSwitchInput
          checked={ipcTrace}
          onCheckedChange={onToggleIpcTrace}
          data-testid={TEST_IDS.settings.developer.ipc.traceSwitch}
        />
      </SettingsRow>
      <SettingsRow label={t("developer.ipc.renderer_crash")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.rendererCrash}
          onClick={rendererCrash}
        >
          {t("developer.ipc.renderer_crash")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.ipc.rust_panic")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.rustPanic}
          onClick={() => void rustPanic()}
        >
          {t("developer.ipc.rust_panic")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.ipc.toast_test")}>
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastSuccess}
            onClick={() => toast.success(t("developer.ipc.toast_success_body"))}
          >
            {t("developer.ipc.toast_success")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastError}
            onClick={() => toast.error(t("developer.ipc.toast_error_body"))}
          >
            {t("developer.ipc.toast_error")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastInfo}
            onClick={() => toast.info(t("developer.ipc.toast_info_body"))}
          >
            {t("developer.ipc.toast_info")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastWarning}
            onClick={() => toast.warning(t("developer.ipc.toast_warning_body"))}
          >
            {t("developer.ipc.toast_warning")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastLoading}
            onClick={() => {
              const id = toast.loading(t("developer.ipc.toast_loading_body"));
              setTimeout(() => toast.success(t("developer.ipc.toast_done_body"), { id }), 1200);
            }}
          >
            {t("developer.ipc.toast_loading")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

export default IpcSection;
