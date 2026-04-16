import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import {
  IDE_DEFINITIONS,
  IDE_IDS,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
  type ThemeMode,
} from "@recrest/shared";

import i18n from "@/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

export function GeneralSettings() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);

  const update = async (patch: Record<string, unknown>) => {
    await dispatch(saveSettings(patch)).unwrap();
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">{t("sections.general")}</h2>
      <Field label={t("fields.theme")}>
        <select
          value={settings.theme}
          onChange={(e) => void update({ theme: e.target.value as ThemeMode })}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="system">{t("theme.system")}</option>
          <option value="light">{t("theme.light")}</option>
          <option value="dark">{t("theme.dark")}</option>
        </select>
      </Field>

      <Field label={t("fields.language")}>
        <select
          value={settings.locale}
          onChange={(e) => {
            const locale = e.target.value;
            void update({ locale });
            void i18n.changeLanguage(locale);
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </Field>

      <Field label={t("fields.polling_interval")}>
        <input
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
          className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
        />
      </Field>

      <Field label={t("fields.default_ide")}>
        <select
          value={settings.defaultIde ?? ""}
          onChange={(e) => void update({ defaultIde: e.target.value || null })}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">{t("ide.auto_detect")}</option>
          {IDE_IDS.map((id) => (
            <option key={id} value={id}>
              {IDE_DEFINITIONS[id].name}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  );
}
