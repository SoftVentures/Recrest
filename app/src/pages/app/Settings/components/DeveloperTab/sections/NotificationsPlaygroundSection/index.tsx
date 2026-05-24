import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { NOTIF_KEY_PREFIX } from "@/lib/constants/storage.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { BURST_REPO_ID, makeBurstPr, makeBurstRepo } from "@/lib/dev/seed/notificationBurst";
import { ButtonRow } from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setPrs } from "@/store/actions/prs.actions";
import { upsertRepo } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

export function NotificationsPlaygroundSection() {
  const dispatch = useAppDispatch();

  const burst = () => {
    dispatch(upsertRepo(makeBurstRepo()));
    const prs = Array.from({ length: 7 }, (_, i) => makeBurstPr(i + 1));
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs }));
    toast.info("Notification burst dispatched");
  };

  const clearBurst = () => {
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs: [] }));
    toast.success("Burst cleared");
  };

  const clearBaseline = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NOTIF_KEY_PREFIX)) localStorage.removeItem(key);
      }
      toast.success("Notification baseline cleared");
    } catch {
      toast.error("Could not access localStorage");
    }
  };

  return (
    <SettingsSection
      title="Notifications playground"
      testId={TEST_IDS.settings.developer.sections.notifications}
    >
      <SettingsRow
        label="Send burst"
        sub="Inject 7 fake PRs from a dev-burst repo to test coalescing behavior."
      >
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.notif.sendBurst}
            onClick={burst}
          >
            Send burst
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="ghost"
            data-testid={TEST_IDS.settings.developer.notif.clearBurst}
            onClick={clearBurst}
          >
            Clear burst
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Clear notification baseline">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid={TEST_IDS.settings.developer.notif.clearBaseline}
          onClick={clearBaseline}
        >
          Clear baseline
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default NotificationsPlaygroundSection;
