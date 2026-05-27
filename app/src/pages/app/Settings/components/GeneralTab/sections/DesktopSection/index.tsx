import { useTranslation } from "react-i18next";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function DesktopSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { autoStart, startMinimized, closeToTray } = useAppSelector((s) => s.settings.desktop);

  return (
    <SettingsSection title={t("settings.sections.desktop")}>
      <SettingsRow
        label={t("settings.desktop.auto_start")}
        sub={t("settings.desktop.auto_start_desc")}
      >
        <GeneralSwitchInput
          checked={autoStart}
          onCheckedChange={(v) => dispatch(setDesktopAutoStart(v))}
          data-testid={TEST_IDS.settings.general.desktopAutoStart}
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.desktop.start_minimized")}
        sub={t("settings.desktop.start_minimized_desc")}
      >
        <GeneralSwitchInput
          checked={startMinimized}
          onCheckedChange={(v) => dispatch(setDesktopStartMinimized(v))}
          data-testid={TEST_IDS.settings.general.desktopStartMinimized}
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.desktop.close_to_tray")}
        sub={t("settings.desktop.close_to_tray_desc")}
      >
        <GeneralSwitchInput
          checked={closeToTray}
          onCheckedChange={(v) => dispatch(setDesktopCloseToTray(v))}
          data-testid={TEST_IDS.settings.general.desktopCloseToTray}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export default DesktopSection;
