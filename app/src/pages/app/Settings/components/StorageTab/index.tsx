import { useTranslation } from "react-i18next";

import { Info } from "lucide-react";

import GeneralIconButton, {
  IconButtonSize,
  IconButtonVariant,
} from "@/components/atoms/buttons/GeneralIconButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setCrashReporting } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
          aria-label={t("settings.storage.crash_reporting")}
          data-testid={TEST_IDS.settings.storage.crashReporting}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
