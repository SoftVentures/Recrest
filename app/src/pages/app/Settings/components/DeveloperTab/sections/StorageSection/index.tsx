import { useState } from "react";

import { useTranslation } from "react-i18next";

import { type AppSettings, POLLING_INTERVAL_DEFAULT_MS } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { clearProviderToken } from "@/store/actions/providers.actions";
import { scanForRepos } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { setOnboardingOverride } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// A pending destructive action awaiting confirmation. We funnel every confirm
// through the app's `ConfirmationModal` instead of `window.confirm` because the
// latter is rerouted to the Tauri dialog plugin (async + ACL-gated) inside the
// desktop shell — there it throws "dialog.confirm not allowed" and, even when
// permitted, returns a Promise so `if (!window.confirm(...))` never blocks.
interface PendingAction {
  title: string;
  description?: string;
  confirmLabel: string;
  run: () => void | Promise<void>;
}

export function StorageSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.providers.connections);
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);

  const [pending, setPending] = useState<PendingAction | null>(null);

  const confirmPending = async () => {
    const action = pending;
    setPending(null);
    if (action) await action.run();
  };

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
      toast.success(t("developer.storage.copy_state_done"));
    } catch {
      toast.error(t("developer.storage.copy_state_error"));
    }
  };

  const wipeLocal = () => {
    try {
      localStorage.removeItem(StorageKey.UI_STATE);
      toast.success(t("developer.storage.wipe_local_done"));
    } catch {
      toast.error(t("developer.storage.localstorage_error"));
    }
  };

  const resetSettings = async () => {
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
    toast.success(t("developer.storage.reset_settings_done"));
  };

  const clearTokens = async () => {
    for (const conn of Object.values(providers)) {
      if (!conn) continue;
      await dispatch(clearProviderToken(conn.providerId));
    }
    toast.success(t("developer.storage.clear_tokens_done"));
  };

  const retriggerOnboarding = () => {
    try {
      localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
      // Force-flag survives the reload via sessionStorage and tells
      // `useFirstRun` to bypass the no-scanPaths / no-providers gates so the
      // wizard shows even on an already-set-up install.
      sessionStorage.setItem(`${StorageKey.ONBOARDING_DISMISSED}-force`, "true");
    } catch {
      /* ignore */
    }
    toast.success(t("developer.storage.retrigger_onboarding_done"));
    setTimeout(() => window.location.reload(), 250);
  };

  const rescanRepos = async () => {
    if (scanPaths.length === 0) {
      toast.info(t("developer.storage.no_scan_paths"));
      return;
    }
    await dispatch(scanForRepos(scanPaths));
    toast.success(t("developer.storage.rescan_done"));
  };

  const openOnboarding = () => {
    dispatch(setOnboardingOverride(true));
    toast.success(t("developer.storage.open_onboarding_done"));
  };

  return (
    <SettingsSection
      title={t("developer.sections.storage")}
      testId={TEST_IDS.settings.developer.sections.storage}
    >
      <SettingsRow
        label={t("developer.storage.copy_state")}
        sub={t("developer.storage.copy_state_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.copyState}
          onClick={() => void copyState()}
        >
          {t("developer.storage.copy_state_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label={t("developer.storage.wipe_local")}
        sub={t("developer.storage.wipe_local_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.wipeLocal}
          onClick={() =>
            setPending({
              title: t("developer.storage.wipe_local_confirm_title"),
              description: t("developer.storage.wipe_local_sub"),
              confirmLabel: t("developer.storage.wipe_local_button"),
              run: wipeLocal,
            })
          }
        >
          {t("developer.storage.wipe_local_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.storage.reset_settings")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.resetSettings}
          onClick={() =>
            setPending({
              title: t("developer.storage.reset_settings_confirm_title"),
              confirmLabel: t("developer.storage.reset_settings_button"),
              run: resetSettings,
            })
          }
        >
          {t("developer.storage.reset_settings_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label={t("developer.storage.clear_tokens")}
        sub={t("developer.storage.clear_tokens_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.clearTokens}
          onClick={() =>
            setPending({
              title: t("developer.storage.clear_tokens_confirm_title"),
              confirmLabel: t("developer.storage.clear_tokens_button"),
              run: clearTokens,
            })
          }
        >
          {t("developer.storage.clear_tokens_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.storage.retrigger_onboarding")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.retriggerOnboarding}
          onClick={() =>
            setPending({
              title: t("developer.storage.retrigger_onboarding_confirm_title"),
              description: t("developer.storage.reload_note"),
              confirmLabel: t("developer.storage.retrigger_onboarding_button"),
              run: retriggerOnboarding,
            })
          }
        >
          {t("developer.storage.retrigger_onboarding_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label={t("developer.storage.open_onboarding")}
        sub={t("developer.storage.open_onboarding_sub")}
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.openOnboarding}
          onClick={openOnboarding}
        >
          {t("developer.storage.open_onboarding_button")}
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label={t("developer.storage.rescan_repos")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.storage.rescan}
          onClick={() => void rescanRepos()}
        >
          {t("developer.storage.rescan_button")}
        </GeneralButton>
      </SettingsRow>

      <ConfirmationModal
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel ?? t("developer.storage.confirm_fallback")}
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmPending()}
      />
    </SettingsSection>
  );
}

export default StorageSection;
