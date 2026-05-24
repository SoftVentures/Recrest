import { useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { safeInvoke, toggleWebviewDevtools } from "@/lib/tauri";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

export function IpcSection() {
  const [ipcTrace, setIpcTrace] = useState(false);

  const rendererCrash = () => {
    setTimeout(() => {
      throw new Error("dev-forced renderer crash");
    }, 0);
  };

  const rustPanic = async () => {
    await safeInvoke(TauriCommand.DEV_PANIC);
  };

  return (
    <SettingsSection title="IPC & Debug" testId={TEST_IDS.settings.developer.sections.ipc}>
      <SettingsRow
        label="Toggle DevTools"
        sub="Opens the webview's built-in inspector (Tauri only)."
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.toggleDevtools}
          onClick={() => void toggleWebviewDevtools()}
        >
          Toggle DevTools
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label="Trace IPC calls"
        sub="Log every invoke + event to the dev console with timing info."
      >
        <GeneralSwitchInput
          checked={ipcTrace}
          onCheckedChange={setIpcTrace}
          data-testid={TEST_IDS.settings.developer.ipc.traceSwitch}
        />
      </SettingsRow>
      <SettingsRow label="Force renderer crash">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.rendererCrash}
          onClick={rendererCrash}
        >
          Force renderer crash
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Force Rust panic">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.ipc.rustPanic}
          onClick={() => void rustPanic()}
        >
          Force Rust panic
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Toast tests">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastSuccess}
            onClick={() => toast.success("Success toast")}
          >
            Success
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastError}
            onClick={() => toast.error("Error toast")}
          >
            Error
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastInfo}
            onClick={() => toast.info("Info toast")}
          >
            Info
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastWarning}
            onClick={() => toast.warning("Warning toast")}
          >
            Warning
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.ipc.toastLoading}
            onClick={() => {
              const id = toast.loading("Loading…");
              setTimeout(() => toast.success("Done!", { id }), 1200);
            }}
          >
            Loading
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

export default IpcSection;
