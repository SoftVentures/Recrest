import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import type { AutoUpdateMode, PlatformInfo } from "@recrest/shared";

import { SettingsField, SettingsSection } from "@/components/settings/shared";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useGitInfo } from "@/hooks/useGitInfo";
import { isTauri } from "@/lib/tauri";
import { systemService, updaterService } from "@/lib/tauri/services";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

function useSaver() {
  const { t } = useTranslation("errors");
  const dispatch = useAppDispatch();
  return async (patch: Record<string, unknown>) => {
    try {
      await dispatch(saveSettings(patch)).unwrap();
    } catch {
      toast.error(t("internal"));
    }
  };
}

export function DesktopSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const save = useSaver();
  const disabled = !isTauri();

  return (
    <SettingsSection title={t("sections.desktop")}>
      <SettingsField label={t("desktop.auto_start")} description={t("desktop.auto_start_desc")}>
        <Switch
          checked={s.autoStart}
          disabled={disabled}
          onCheckedChange={(v) => {
            // Persist the pref AND tell the autostart plugin to actually
            // register/deregister the login item. Without the plugin side,
            // the OS never learns about the change.
            void save({ autoStart: v });
            if (!isTauri()) return;
            void (async () => {
              try {
                const autostart = await import("@tauri-apps/plugin-autostart");
                if (v) await autostart.enable();
                else await autostart.disable();
              } catch {
                // Plugin might not be available on every platform; the
                // Redux state still reflects the user's intent.
              }
            })();
          }}
        />
      </SettingsField>

      <SettingsField
        label={t("desktop.start_minimized")}
        description={t("desktop.start_minimized_desc")}
      >
        <Switch
          checked={s.startMinimized}
          disabled={disabled}
          onCheckedChange={(v) => void save({ startMinimized: v })}
        />
      </SettingsField>

      <SettingsField
        label={t("desktop.close_to_tray")}
        description={t("desktop.close_to_tray_desc")}
        hint={t("desktop.close_to_tray_hint")}
      >
        <Switch
          checked={s.closeToTray}
          disabled={disabled}
          onCheckedChange={(v) => void save({ closeToTray: v })}
        />
      </SettingsField>
    </SettingsSection>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation("settings");
  const n = useAppSelector((state) => state.settings.notifications);
  const save = useSaver();
  const disabled = !isTauri();

  const update = (patch: Partial<typeof n>) => {
    void save({ notifications: { ...n, ...patch } });
  };

  return (
    <SettingsSection title={t("sections.notifications")}>
      <SettingsField
        label={t("notifications.enabled")}
        description={t("notifications.enabled_desc")}
      >
        <Switch
          checked={n.enabled}
          disabled={disabled}
          onCheckedChange={(v) => update({ enabled: v })}
        />
      </SettingsField>
      <SettingsField label={t("notifications.new_pr")}>
        <Switch
          checked={n.newPr}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ newPr: v })}
        />
      </SettingsField>
      <SettingsField label={t("notifications.ci_failed")}>
        <Switch
          checked={n.ciFailed}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ ciFailed: v })}
        />
      </SettingsField>
      <SettingsField label={t("notifications.merge_ready")}>
        <Switch
          checked={n.mergeReady}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ mergeReady: v })}
        />
      </SettingsField>
    </SettingsSection>
  );
}

export function UpdatesSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const save = useSaver();
  const [checking, setChecking] = useState(false);
  const disabled = !isTauri();

  const checkNow = async () => {
    setChecking(true);
    try {
      const info = await updaterService.checkForUpdate();
      if (info) {
        toast.success(t("updates.available", { version: info.version }));
      } else {
        toast.info(t("updates.up_to_date"));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingsSection title={t("sections.updates")}>
      <SettingsField label={t("updates.mode")} hint={t("updates.mode_hint")} htmlFor="update-mode">
        <Select
          value={s.autoUpdate}
          onValueChange={(value) => void save({ autoUpdate: value as AutoUpdateMode })}
          disabled={disabled}
        >
          <SelectTrigger id="update-mode" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("updates.mode_auto")}</SelectItem>
            <SelectItem value="manual">{t("updates.mode_manual")}</SelectItem>
            <SelectItem value="off">{t("updates.mode_off")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>
      <SettingsField label={t("updates.check_now")} layout="inline">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          loading={checking}
          onClick={() => void checkNow()}
        >
          {checking ? t("updates.checking") : t("updates.check_now")}
        </Button>
      </SettingsField>
    </SettingsSection>
  );
}

export function DiagnosticsSettings() {
  const { t } = useTranslation("settings");
  const crashReporting = useAppSelector((state) => state.settings.crashReporting);
  const save = useSaver();
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const git = useGitInfo();
  const disabled = !isTauri();

  useEffect(() => {
    void systemService.getPlatformInfo().then(setPlatform);
  }, []);

  return (
    <SettingsSection title={t("sections.diagnostics")}>
      <SettingsField
        label={t("diagnostics.crash_reporting")}
        description={t("diagnostics.crash_reporting_desc")}
        hint={t("diagnostics.crash_reporting_hint")}
      >
        <Switch
          checked={crashReporting}
          disabled={disabled}
          onCheckedChange={(v) => void save({ crashReporting: v })}
        />
      </SettingsField>
      <div className="space-y-1.5 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{t("diagnostics.os")}: </span>
          {platform ? `${platform.os} ${platform.version} (${platform.arch})` : "—"}
        </div>
        <div className="flex items-center gap-1.5">
          <span>
            <span className="font-medium text-foreground">{t("diagnostics.git")}: </span>
            {git.status === "loading"
              ? "…"
              : git.info?.installed
                ? (git.info.version ?? t("diagnostics.git_installed"))
                : t("diagnostics.git_not_installed")}
          </span>
          <InfoHint>{t("diagnostics.git_hint")}</InfoHint>
          {git.info?.path && (
            <span className="truncate font-mono text-[11px] opacity-70" title={git.info.path}>
              — {git.info.path}
            </span>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
