import { type AppSettings, POLLING_INTERVAL_DEFAULT_MS } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { StorageKey } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { clearProviderToken } from "@/store/actions/providers.actions";
import { scanForRepos } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { setOnboardingOverride } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function StorageSection() {
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.providers.connections);
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);

  const copyState = async () => {
    try {
      const { store } = await import("@/store");
      const state = store.getState();
      const redacted = JSON.parse(
        JSON.stringify(state, (key, value) =>
          typeof value === "string" && /token|secret|password/i.test(key) ? "[redacted]" : value,
        ),
      );
      await navigator.clipboard?.writeText(JSON.stringify(redacted, null, 2));
      toast.success("Redux state copied");
    } catch {
      toast.error("Could not copy state");
    }
  };

  const wipeLocal = () => {
    if (!window.confirm("Wipe localStorage? Type-to-confirm replaced by browser prompt.")) return;
    try {
      localStorage.removeItem(StorageKey.UI_STATE);
      toast.success("localStorage wiped");
    } catch {
      toast.error("Could not access localStorage");
    }
  };

  const resetSettings = async () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    const defaults: Partial<AppSettings> = {
      pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
      defaultIde: null,
      theme: "system",
      locale: "en",
      scanPaths: [],
      autoStart: false,
      autoUpdate: "manual",
      startMinimized: false,
      closeToTray: true,
      notifications: { enabled: false, newPr: true, ciFailed: true, mergeReady: true },
      crashReporting: false,
    };
    await dispatch(saveSettings(defaults));
    toast.success("Settings reset to defaults");
  };

  const clearTokens = async () => {
    if (!window.confirm("Clear ALL provider tokens from keychain?")) return;
    for (const conn of Object.values(providers)) {
      if (!conn) continue;
      await dispatch(clearProviderToken(conn.providerId));
    }
    toast.success("Provider tokens cleared");
  };

  const retriggerOnboarding = () => {
    if (!window.confirm("Re-trigger onboarding? Page will reload.")) return;
    try {
      localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
      // Force-flag survives the reload via sessionStorage and tells
      // `useFirstRun` to bypass the no-scanPaths / no-providers gates so the
      // wizard shows even on an already-set-up install.
      sessionStorage.setItem(`${StorageKey.ONBOARDING_DISMISSED}-force`, "true");
    } catch {
      /* ignore */
    }
    toast.success("Onboarding re-triggered");
    setTimeout(() => window.location.reload(), 250);
  };

  const rescanRepos = async () => {
    if (scanPaths.length === 0) {
      toast.info("No scan paths configured");
      return;
    }
    await dispatch(scanForRepos(scanPaths));
    toast.success("Rescan complete");
  };

  const openOnboarding = () => {
    dispatch(setOnboardingOverride(true));
    toast.success("Onboarding wizard opened");
  };

  return (
    <SettingsSection title="Storage" testId={TEST_IDS.settings.developer.sections.storage}>
      <SettingsRow label="Copy Redux state" sub="Snapshot the store as JSON with secrets redacted.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.copyState}
          onClick={() => void copyState()}
        >
          Copy state
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Wipe localStorage" sub="Removes every `recrest:*` key.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.wipeLocal}
          onClick={wipeLocal}
        >
          Wipe
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Reset settings to defaults">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.resetSettings}
          onClick={() => void resetSettings()}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Clear all provider tokens" sub="Removes tokens from the keychain.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.clearTokens}
          onClick={() => void clearTokens()}
        >
          Clear tokens
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Re-trigger onboarding">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.retriggerOnboarding}
          onClick={retriggerOnboarding}
        >
          Re-trigger
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label="Open onboarding wizard"
        sub="Show the first-run wizard now — does not touch saved settings."
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.openOnboarding}
          onClick={openOnboarding}
        >
          Open
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Rescan repositories">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.rescan}
          onClick={() => void rescanRepos()}
        >
          Rescan
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default StorageSection;
