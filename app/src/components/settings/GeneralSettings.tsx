import { useTranslation } from "react-i18next";

import {
  IDE_DEFINITIONS,
  IDE_IDS,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
} from "@recrest/shared";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

export function SystemSettings() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);

  const update = async (patch: Record<string, unknown>) => {
    try {
      await dispatch(saveSettings(patch)).unwrap();
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  const pollingMinutes = Math.round(settings.pollingIntervalMs / 60_000);

  return (
    <section className="a-set-section">
      <h3>{t("sections.general")}</h3>
      <div className="a-set-card">
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("fields.polling_interval")}</div>
            <div className="a-set-row-sub">{t("fields.polling_interval_hint")}</div>
          </div>
          <div className="a-set-row-r">
            <input
              className="a-set-input"
              type="number"
              min={POLLING_INTERVAL_MIN_MS / 60_000}
              max={POLLING_INTERVAL_MAX_MS / 60_000}
              step={1}
              value={pollingMinutes}
              onChange={(e) => {
                const minutes = Number(e.target.value);
                if (!Number.isFinite(minutes)) return;
                const clamped = Math.max(
                  POLLING_INTERVAL_MIN_MS,
                  Math.min(POLLING_INTERVAL_MAX_MS, minutes * 60_000),
                );
                void update({ pollingIntervalMs: clamped });
              }}
              style={{ width: 96 }}
            />
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("fields.default_ide")}</div>
          </div>
          <div className="a-set-row-r">
            <Select
              value={settings.defaultIde ?? "auto"}
              onValueChange={(value) =>
                void update({ defaultIde: value === "auto" ? null : value })
              }
            >
              <SelectTrigger className="a-set-trigger" style={{ minWidth: 180 }}>
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
          </div>
        </div>
      </div>
    </section>
  );
}
