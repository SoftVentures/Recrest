import { useEffect, useState } from "react";

import { Ban, BellRing, DownloadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type AutoUpdateMode, TauriCommand } from "@recrest/shared";

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
import { isTauri, safeInvoke } from "@/lib/tauri";
import { updaterService } from "@/lib/tauri/services";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/store/hooks";

/** Short settle window we give the Rust-side updater check to emit its
 *  `updater://available` event after the invoke() resolves. If no banner
 *  appeared within the window, the check is treated as "up to date". */
const CHECK_SETTLE_MS = 1500;

export function UpdatesSettings() {
  const { t } = useTranslation("settings");
  const s = useAppSelector((state) => state.settings);
  const banner = useAppSelector((state) => state.ui.updaterBanner);
  const save = useSettingsSaver();
  const [checking, setChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const disabled = !isTauri();

  useEffect(() => {
    void updaterService.getCurrentVersion().then((v) => setCurrentVersion(v));
  }, []);

  const checkNow = async () => {
    setChecking(true);
    const toastId = toast.loading(t("updates.checking"));
    // Snapshot banner version at the time the check begins so we can tell
    // an "update appeared" from a stale banner the user hasn't dismissed.
    const { store } = await import("@/store");
    const beforeVersion = store.getState().ui.updaterBanner?.version ?? null;
    try {
      await safeInvoke(TauriCommand.CHECK_FOR_UPDATE, { autoInstall: false });
      // Rust emits `updater://available` asynchronously on the event bus;
      // `useGlobalEvents` dispatches it into Redux. Give the pipeline a
      // short window to settle before deciding whether anything fired.
      await new Promise((r) => setTimeout(r, CHECK_SETTLE_MS));
      const afterBanner = store.getState().ui.updaterBanner;
      if (afterBanner && afterBanner.version !== beforeVersion) {
        toast.success(t("updates.available", { version: afterBanner.version }), { id: toastId });
      } else {
        toast.success(t("updates.up_to_date"), { id: toastId });
      }
    } catch {
      toast.error(t("updater.check_failed"), { id: toastId });
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingsSection title={t("sections.updates")}>
      <SettingsField label={t("updates.current_version_label")}>
        <span className="font-mono text-xs text-muted-foreground">
          {currentVersion ? `v${currentVersion}` : "—"}
        </span>
      </SettingsField>
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
                <DownloadCloud className="h-3.5 w-3.5" aria-hidden />
                {t("updates.mode_auto")}
              </span>
            </SelectItem>
            <SelectItem value="manual">
              <span className="inline-flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5" aria-hidden />
                {t("updates.mode_manual")}
              </span>
            </SelectItem>
            <SelectItem value="off">
              <span className="inline-flex items-center gap-2">
                <Ban className="h-3.5 w-3.5" aria-hidden />
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
      {banner && banner.canAutoInstall === false && (
        <SettingsField label={t("updater.manual_note_label")}>
          <span className="text-xs text-muted-foreground">{t("updater.manual_note")}</span>
        </SettingsField>
      )}
    </SettingsSection>
  );
}
