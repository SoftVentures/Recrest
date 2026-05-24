import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AutoUpdateMode, TauriCommand } from "@recrest/shared";

import { Ban, BellRing, DownloadCloud } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setUpdateMode } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const UPDATE_MODES: { value: AutoUpdateMode; label: string; icon: typeof DownloadCloud }[] = [
  { value: AutoUpdateMode.AUTO, label: "Automatic", icon: DownloadCloud },
  { value: AutoUpdateMode.MANUAL, label: "Manual", icon: BellRing },
  { value: AutoUpdateMode.OFF, label: "Off", icon: Ban },
];

const VersionText = styled(Typography)(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Typography;

export function UpdatesSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.settings.updates.mode);
  const [checking, setChecking] = useState(false);

  return (
    <SettingsSection title={t("settings.sections.updates")}>
      <SettingsRow label={t("settings.updates.current_version_label")}>
        <VersionText component="span" variant="caption">
          v0.7.0
        </VersionText>
      </SettingsRow>
      <SettingsRow label={t("settings.updates.mode")} sub={t("settings.updates.mode_hint")}>
        <SelectControl
          size="small"
          value={mode}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setUpdateMode(e.target.value as AutoUpdateMode))
          }
          sx={{ minWidth: 200 }}
          data-testid={TEST_IDS.settings.general.updateModeSelect}
        >
          {UPDATE_MODES.map((m) => {
            const I = m.icon;
            return (
              <MenuItem key={m.value} value={m.value}>
                <I size={13} />
                <Box component="span" sx={{ ml: 1 }}>
                  {m.label}
                </Box>
              </MenuItem>
            );
          })}
        </SelectControl>
      </SettingsRow>
      <SettingsRow label={t("settings.updates.check_now_label")}>
        <GeneralButton
          variant="outline"
          size="sm"
          loading={checking}
          onClick={async () => {
            setChecking(true);
            try {
              if (isTauri()) await invoke(TauriCommand.CHECK_FOR_UPDATE);
            } catch (err) {
              console.warn("[settings] update check failed", err);
            } finally {
              setChecking(false);
            }
          }}
          data-testid={TEST_IDS.settings.general.updateCheckNow}
        >
          {checking ? t("settings.updates.checking") : t("settings.updates.check_now")}
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default UpdatesSection;
