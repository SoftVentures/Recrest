import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Switch } from "@/components/atoms/Switch";
import { SettingsField } from "@/components/molecules/SettingsField";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { isTauri } from "@/lib/tauri";
import { autostartService } from "@/lib/tauri/services";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/store/hooks";

export function DesktopSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const save = useSettingsSaver();
  const disabled = !isTauri();

  // Plan 1 §C.3: the toggle's source of truth is the OS-level plugin
  // call, not the `settings.json` mirror. If a user disables Recrest's
  // login item from the Task-Manager Autostart tab, the mirror would
  // still say "on" — that bug used to silently hide that we never
  // actually wrote the registry key. Read once on mount and on every
  // settings update so the displayed switch reflects reality.
  const [pluginEnabled, setPluginEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void autostartService.isEnabled().then((v) => {
      if (!cancelled) setPluginEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [s.autoStart]);

  // Render priority: live plugin state > Redux mirror. Outside Tauri we
  // only have the mirror, which is fine because the toggle is disabled.
  const checked = pluginEnabled ?? s.autoStart;

  const handleAutoStart = (v: boolean) => {
    // Optimistically reflect the desired state in Redux so the user gets
    // immediate feedback. If the plugin call fails we revert + toast.
    void save({ autoStart: v });
    if (!isTauri()) return;
    void (async () => {
      try {
        if (v) await autostartService.enable();
        else await autostartService.disable();
        // Refresh from the plugin so the switch tracks reality even if
        // the OS rejected our request silently.
        const real = await autostartService.isEnabled();
        setPluginEnabled(real);
        if (real !== v) {
          // Plugin accepted but the OS reports a different state — e.g.
          // group policy blocks login items. Revert the mirror.
          await save({ autoStart: real });
          toast.error(t("desktop.auto_start_failed"));
        }
      } catch (err) {
        // The plugin throws a serialised error string when the call
        // failed (Windows registry, macOS LSSharedFileList, …). Surface
        // it via toast and revert the optimistic mirror update.
        console.warn("[autostart] plugin call failed:", err);
        try {
          const real = await autostartService.isEnabled();
          setPluginEnabled(real);
          await save({ autoStart: real });
        } catch {
          // ignore – best-effort revert
        }
        toast.error(t("desktop.auto_start_failed"));
      }
    })();
  };

  return (
    <SettingsSection title={t("sections.desktop")}>
      <SettingsField label={t("desktop.auto_start")} description={t("desktop.auto_start_desc")}>
        <Switch
          checked={checked}
          disabled={disabled}
          aria-label={t("desktop.auto_start")}
          onCheckedChange={handleAutoStart}
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
          aria-label={t("desktop.start_minimized")}
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
          aria-label={t("desktop.close_to_tray")}
        />
      </SettingsField>
    </SettingsSection>
  );
}
