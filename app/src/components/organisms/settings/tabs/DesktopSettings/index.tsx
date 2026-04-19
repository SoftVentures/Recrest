import { useTranslation } from "react-i18next";

import { Switch } from "@/components/atoms/Switch";
import { SettingsField } from "@/components/molecules/SettingsField";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

export function DesktopSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const save = useSettingsSaver();
  const disabled = !isTauri();

  return (
    <SettingsSection title={t("sections.desktop")}>
      <SettingsField label={t("desktop.auto_start")} description={t("desktop.auto_start_desc")}>
        <Switch
          checked={s.autoStart}
          disabled={disabled}
          aria-label={t("desktop.auto_start")}
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
