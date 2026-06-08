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
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setCrashReporting } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.primary,
  padding: "10px 16px",
  fontFamily: MONO_STACK,
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
  const dispatch = useAppDispatch();
  // Backed by `settings.backend.crashReporting` so the toggle survives unmount
  // (switching tabs unmounts this section). The renderer state used to live
  // in local `useState`, which reset the toggle every time the user came back.
  const crashReporting = useAppSelector((s) => s.settings.backend?.crashReporting ?? false);
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
                aria-label={t("settings.more_info", { ns: I18nNamespace.ARIA })}
                icon={<Info size={11} />}
              />
            </GeneralTooltip>
          </>
        }
        sub={t("settings.storage.crash_reporting_sub")}
      >
        <GeneralSwitchInput
          checked={crashReporting}
          onCheckedChange={(v) => dispatch(setCrashReporting(v))}
        />
      </SettingsRow>

      <FactsBox>
        <FactRow>
          <Box component="strong">Operating system:</Box>
          <Box component="span">macos 15.0 (x86_64)</Box>
        </FactRow>
        <FactRow>
          <Box component="strong">Git:</Box>
          <Box component="span">2.44.0</Box>
          <GeneralIconButton
            size={IconButtonSize.XS}
            variant={IconButtonVariant.GHOST}
            aria-label={t("settings.more_info", { ns: I18nNamespace.ARIA })}
            tooltip={t("settings.storage.git_info")}
            icon={<Info size={11} />}
          />
        </FactRow>
      </FactsBox>
    </SettingsSection>
  );
}
