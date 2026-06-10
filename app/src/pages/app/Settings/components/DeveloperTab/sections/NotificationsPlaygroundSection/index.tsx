import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { NOTIF_KEY_PREFIX } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { BURST_REPO_ID, makeBurstPr, makeBurstRepo } from "@/lib/dev/seed/notificationBurst";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setPrs } from "@/store/actions/prs.actions";
import { upsertRepo } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

export function NotificationsPlaygroundSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const dispatch = useAppDispatch();

  const burst = () => {
    dispatch(upsertRepo(makeBurstRepo()));
    const prs = Array.from({ length: 7 }, (_, i) => makeBurstPr(i + 1));
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs }));
    toast.info(t("developer.notifications.burst_dispatched"));
  };

  const clearBurst = () => {
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs: [] }));
    toast.success(t("developer.notifications.clear_burst_done"));
  };

  const clearBaseline = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NOTIF_KEY_PREFIX)) localStorage.removeItem(key);
      }
      toast.success(t("developer.notifications.baseline_cleared"));
    } catch {
      toast.error(t("developer.notifications.localstorage_error"));
    }
  };

  return (
    <SettingsSection
      title={t("developer.sections.notifications")}
      testId={TEST_IDS.settings.developer.sections.notifications}
    >
      <SettingsRow
        label={t("developer.notifications.send_burst_label")}
        sub={t("developer.notifications.send_burst_sub")}
      >
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.notif.sendBurst}
            onClick={burst}
          >
            {t("developer.notifications.send_burst")}
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="ghost"
            data-testid={TEST_IDS.settings.developer.notif.clearBurst}
            onClick={clearBurst}
          >
            {t("developer.notifications.clear_burst")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label={t("developer.notifications.clear_baseline")}>
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.notif.clearBaseline}
          onClick={clearBaseline}
        >
          {t("developer.notifications.clear_baseline_button")}
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default NotificationsPlaygroundSection;
