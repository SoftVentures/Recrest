import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import type { PlatformInfo } from "@recrest/shared";

import { Switch } from "@/components/atoms/Switch";
import { InfoHint } from "@/components/molecules/InfoHint";
import { SettingsField } from "@/components/molecules/SettingsField";
import { TruncatedTooltip } from "@/components/molecules/compounds/TruncatedTooltip";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { useGitInfo } from "@/hooks/useGitInfo";
import { isTauri } from "@/lib/tauri";
import { systemService } from "@/lib/tauri/services";
import { useAppSelector } from "@/store/hooks";

export function DiagnosticsSettings() {
  const { t } = useTranslation("settings");
  const crashReporting = useAppSelector((state) => state.settings.crashReporting);
  const save = useSettingsSaver();
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const git = useGitInfo();
  const disabled = !isTauri();

  useEffect(() => {
    void systemService.getPlatformInfo().then(setPlatform);
  }, []);

  return (
    <SettingsSection title={t("sections.diagnostics")}>
      <SettingsField
        label={t("diagnostics.crash_reporting")}
        description={t("diagnostics.crash_reporting_desc")}
        hint={t("diagnostics.crash_reporting_hint")}
      >
        <Switch
          checked={crashReporting}
          disabled={disabled}
          onCheckedChange={(v) => void save({ crashReporting: v })}
          aria-label={t("diagnostics.crash_reporting")}
        />
      </SettingsField>
      <div className="space-y-1.5 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{t("diagnostics.os")}: </span>
          {platform ? `${platform.os} ${platform.version} (${platform.arch})` : "—"}
        </div>
        <div className="flex items-center gap-1.5">
          <span>
            <span className="font-medium text-foreground">{t("diagnostics.git")}: </span>
            {git.status === "loading"
              ? "…"
              : git.info?.installed
                ? (git.info.version ?? t("diagnostics.git_installed"))
                : t("diagnostics.git_not_installed")}
          </span>
          <InfoHint>{t("diagnostics.git_hint")}</InfoHint>
          {git.info?.path && (
            <TruncatedTooltip content={git.info.path}>
              <span className="truncate font-mono text-[11px] opacity-70">— {git.info.path}</span>
            </TruncatedTooltip>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
