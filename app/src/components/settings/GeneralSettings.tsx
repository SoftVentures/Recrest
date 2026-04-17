import { useTranslation } from "react-i18next";

import {
  IDE_DEFINITIONS,
  IDE_IDS,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
  type ThemeMode,
} from "@recrest/shared";

import { SettingsField, SettingsSection } from "@/components/settings/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import i18n from "@/i18n";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

export function GeneralSettings() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);

  const update = async (patch: Record<string, unknown>) => {
    try {
      await dispatch(saveSettings(patch)).unwrap();
    } catch {
      toast.error(t("errors.internal", { ns: "errors" }));
    }
  };

  return (
    <SettingsSection title={t("sections.general")}>
      <SettingsField label={t("fields.theme")} htmlFor="theme-select">
        <Select
          value={settings.theme}
          onValueChange={(value) => void update({ theme: value as ThemeMode })}
        >
          <SelectTrigger id="theme-select" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t("theme.system")}</SelectItem>
            <SelectItem value="light">{t("theme.light")}</SelectItem>
            <SelectItem value="dark">{t("theme.dark")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField label={t("fields.language")} htmlFor="locale-select">
        <Select
          value={settings.locale}
          onValueChange={(value) => {
            void update({ locale: value });
            void i18n.changeLanguage(value);
          }}
        >
          <SelectTrigger id="locale-select" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label={t("fields.polling_interval")}
        hint={t("fields.polling_interval_hint")}
        htmlFor="polling-input"
      >
        <Input
          id="polling-input"
          type="number"
          min={POLLING_INTERVAL_MIN_MS / 60_000}
          max={POLLING_INTERVAL_MAX_MS / 60_000}
          step={1}
          value={Math.round(settings.pollingIntervalMs / 60_000)}
          onChange={(e) => {
            const minutes = Number(e.target.value);
            if (!Number.isFinite(minutes)) return;
            const clamped = Math.max(
              POLLING_INTERVAL_MIN_MS,
              Math.min(POLLING_INTERVAL_MAX_MS, minutes * 60_000),
            );
            void update({ pollingIntervalMs: clamped });
          }}
          className="w-24"
        />
      </SettingsField>

      <SettingsField label={t("fields.default_ide")} htmlFor="ide-select">
        <Select
          value={settings.defaultIde ?? "auto"}
          onValueChange={(value) =>
            void update({ defaultIde: value === "auto" ? null : value })
          }
        >
          <SelectTrigger id="ide-select" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("ide.auto_detect")}</SelectItem>
            {IDE_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {IDE_DEFINITIONS[id].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsField>
    </SettingsSection>
  );
}
