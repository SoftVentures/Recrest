import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Info } from "lucide-react";

import GeneralIconButton, {
  IconButtonSize,
  IconButtonVariant,
} from "@/components/atoms/buttons/GeneralIconButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.primary,
  padding: "10px 16px",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  "& strong": {
    fontWeight: 600,
    fontFamily: "inherit",
    color: theme.palette.text.primary,
  },
  "& span": { color: theme.palette.text.information },
})) as typeof Box;

const FactsBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  marginTop: 8,
  "& > div + div": { borderTop: `1px solid ${theme.palette.divider}` },
})) as typeof Box;

export function StorageSection() {
  const { t } = useTranslation();
  const [crashReporting, setCrashReporting] = useState(false);
  return (
    <SettingsSection title={t("settings.storage.diagnostics")}>
      <SettingsRow
        label={
          <>
            {t("settings.storage.crash_reporting")}
            <GeneralTooltip
              title={t("settings.storage.crash_reporting_info")}
              arrow
              placement="top"
            >
              <GeneralIconButton
                size={IconButtonSize.XS}
                variant={IconButtonVariant.GHOST}
                aria-label="More info"
                icon={<Info size={11} />}
              />
            </GeneralTooltip>
          </>
        }
        sub={t("settings.storage.crash_reporting_sub")}
      >
        <GeneralSwitchInput checked={crashReporting} onCheckedChange={setCrashReporting} />
      </SettingsRow>

      <FactsBox>
        <FactRow>
          <Box component="strong">Operating system:</Box>
          <Box component="span">macos 15.0 (x86_64)</Box>
        </FactRow>
        <FactRow>
          <Box component="strong">Git:</Box>
          <Box component="span">2.44.0</Box>
          <GeneralTooltip title={t("settings.storage.git_info")} arrow placement="top">
            <GeneralIconButton
              size={IconButtonSize.XS}
              variant={IconButtonVariant.GHOST}
              aria-label="More info"
              icon={<Info size={11} />}
            />
          </GeneralTooltip>
        </FactRow>
      </FactsBox>
    </SettingsSection>
  );
}
