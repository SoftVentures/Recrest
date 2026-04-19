import { useTranslation } from "react-i18next";

import { Switch } from "@/components/atoms/Switch";
import { SettingsField } from "@/components/molecules/SettingsField";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

export function NotificationSettings() {
  const { t } = useTranslation("settings");
  const n = useAppSelector((state) => state.settings.notifications);
  const save = useSettingsSaver();
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
          aria-label={t("notifications.enabled")}
        />
      </SettingsField>
      <SettingsField label={t("notifications.new_pr")}>
        <Switch
          checked={n.newPr}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ newPr: v })}
          aria-label={t("notifications.new_pr")}
        />
      </SettingsField>
      <SettingsField label={t("notifications.ci_failed")}>
        <Switch
          checked={n.ciFailed}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ ciFailed: v })}
          aria-label={t("notifications.ci_failed")}
        />
      </SettingsField>
      <SettingsField label={t("notifications.merge_ready")}>
        <Switch
          checked={n.mergeReady}
          disabled={disabled || !n.enabled}
          onCheckedChange={(v) => update({ mergeReady: v })}
          aria-label={t("notifications.merge_ready")}
        />
      </SettingsField>
    </SettingsSection>
  );
}
