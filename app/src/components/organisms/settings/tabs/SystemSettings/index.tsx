import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import {
  IDE_DEFINITIONS,
  IDE_IDS,
  type IdeId,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
} from "@recrest/shared";

import { IdeIcon } from "@/components/atoms/IdeIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
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

  // Alle IDEs werden angeboten — unverfügbare zeigen wir ausgegraut an, damit
  // der User sofort erkennt, welche Tools er noch installieren könnte.
  // `detectedIdes` kommt von Rust (which/where über `IDE_COMMANDS`).
  const detectedSet = useMemo(
    () => new Set<string>(settings.detectedIdes),
    [settings.detectedIdes],
  );
  const firstDetected = useMemo<IdeId | null>(
    () => IDE_IDS.find((id) => detectedSet.has(id)) ?? null,
    [detectedSet],
  );
  const hasDetected = firstDetected != null;
  const autoLabel = firstDetected
    ? t("ide.auto_system_default", { ide: IDE_DEFINITIONS[firstDetected].name })
    : t("ide.no_ide_detected");

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
              aria-label={t("fields.polling_interval")}
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
            {!hasDetected && <div className="a-set-row-sub">{t("ide.detection_hint")}</div>}
          </div>
          <div className="a-set-row-r">
            <Select
              value={settings.defaultIde ?? "auto"}
              onValueChange={(value) =>
                void update({ defaultIde: value === "auto" ? null : value })
              }
            >
              <SelectTrigger
                className="a-set-trigger"
                style={{ minWidth: 240 }}
                aria-label={t("fields.default_ide")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="a-ide-row">
                    {firstDetected ? <IdeIcon id={firstDetected} size={14} /> : null}
                    <span>{autoLabel}</span>
                  </span>
                </SelectItem>
                <SelectSeparator />
                {IDE_IDS.map((id) => {
                  const detected = detectedSet.has(id);
                  return (
                    <SelectItem key={id} value={id} disabled={!detected}>
                      <span className={`a-ide-row${detected ? "" : " is-unavailable"}`}>
                        <IdeIcon id={id} size={14} color={detected ? "brand" : "currentColor"} />
                        <span>{IDE_DEFINITIONS[id].name}</span>
                        {!detected && (
                          <span className="a-ide-missing">{t("ide.not_installed_tag")}</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
