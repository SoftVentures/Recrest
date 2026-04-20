import { useState } from "react";

import { CircleSlash, Hand, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AutoUpdateMode } from "@recrest/shared";

import { Button } from "@/components/atoms/Button";
import { SettingsField } from "@/components/molecules/SettingsField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { isTauri } from "@/lib/tauri";
import { updaterService } from "@/lib/tauri/services";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/store/hooks";

export function UpdatesSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const save = useSettingsSaver();
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
            <SelectItem value="auto">
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                {t("updates.mode_auto")}
              </span>
            </SelectItem>
            <SelectItem value="manual">
              <span className="inline-flex items-center gap-2">
                <Hand className="h-3.5 w-3.5" aria-hidden />
                {t("updates.mode_manual")}
              </span>
            </SelectItem>
            <SelectItem value="off">
              <span className="inline-flex items-center gap-2">
                <CircleSlash className="h-3.5 w-3.5" aria-hidden />
                {t("updates.mode_off")}
              </span>
            </SelectItem>
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
