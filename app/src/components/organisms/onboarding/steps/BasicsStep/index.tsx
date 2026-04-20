import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ThemeMode } from "@recrest/shared";

import { Button } from "@/components/atoms/Button";
import { Label } from "@/components/atoms/Label";
import { Switch } from "@/components/atoms/Switch";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
import i18n from "@/i18n";
import { isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function BasicsStep({ onBack, onNext }: Props) {
  const { t } = useTranslation("onboarding");
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings);
  const tauri = isTauri();

  const save = async (patch: Record<string, unknown>) => {
    try {
      await dispatch(saveSettings(patch)).unwrap();
    } catch {
      toast.error(t("errors.internal", { ns: "errors" }));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("basics.title")}</DialogTitle>
        <DialogDescription>{t("basics.body")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Theme */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="ob-theme">{t("basics.theme")}</Label>
            <p className="text-xs text-muted-foreground">{t("basics.theme_desc")}</p>
          </div>
          <Select
            value={settings.theme}
            onValueChange={(v) => void save({ theme: v as ThemeMode })}
          >
            <SelectTrigger id="ob-theme" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <span className="inline-flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5" aria-hidden />
                  {t("theme.system", { ns: "settings" })}
                </span>
              </SelectItem>
              <SelectItem value="light">
                <span className="inline-flex items-center gap-2">
                  <Sun className="h-3.5 w-3.5" aria-hidden />
                  {t("theme.light", { ns: "settings" })}
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="inline-flex items-center gap-2">
                  <Moon className="h-3.5 w-3.5" aria-hidden />
                  {t("theme.dark", { ns: "settings" })}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="ob-locale">{t("basics.language")}</Label>
            <p className="text-xs text-muted-foreground">{t("basics.language_desc")}</p>
          </div>
          <Select
            value={settings.locale}
            onValueChange={(v) => {
              void save({ locale: v });
              void i18n.changeLanguage(v);
            }}
          >
            <SelectTrigger id="ob-locale" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop preferences — only relevant inside Tauri */}
        {tauri && (
          <>
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 space-y-0.5">
                <Label>{t("basics.auto_start")}</Label>
                <p className="text-xs text-muted-foreground">{t("basics.auto_start_desc")}</p>
              </div>
              <Switch
                checked={settings.autoStart}
                onCheckedChange={(v) => void save({ autoStart: v })}
              />
            </div>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 space-y-0.5">
                <Label>{t("basics.close_to_tray")}</Label>
                <p className="text-xs text-muted-foreground">{t("basics.close_to_tray_desc")}</p>
              </div>
              <Switch
                checked={settings.closeToTray}
                onCheckedChange={(v) => void save({ closeToTray: v })}
              />
            </div>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 space-y-0.5">
                <Label>{t("basics.notifications")}</Label>
                <p className="text-xs text-muted-foreground">{t("basics.notifications_desc")}</p>
              </div>
              <Switch
                checked={settings.notifications.enabled}
                onCheckedChange={(v) =>
                  void save({ notifications: { ...settings.notifications, enabled: v } })
                }
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onBack}>
          {t("welcome.back", { defaultValue: t("pickFolder.back") })}
        </Button>
        <Button onClick={onNext}>{t("basics.next")}</Button>
      </DialogFooter>
    </>
  );
}
