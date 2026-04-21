import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { NotificationKind } from "@recrest/shared";
import { TauriCommand } from "@recrest/shared";

import { Switch } from "@/components/atoms/Switch";
import { SettingsField } from "@/components/molecules/SettingsField";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { useSettingsSaver } from "@/components/organisms/settings/tabs/useSettingsSaver";
import { isTauri, safeInvoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/store/hooks";

/** Fires a single representative demo notification of the given kind. The
 *  body and title are i18n'd so DE users see German copy. Used by the inline
 *  "test" button next to each switch. */
async function sendDemoNotification(
  kind: NotificationKind,
  t: (k: string, opts?: Record<string, unknown>) => string,
): Promise<void> {
  const repo = "acme/web";
  const number = 42;
  const pr_title = t(`notifications.${kind}.title`, { ns: "common" });
  await safeInvoke(TauriCommand.NOTIFY, {
    kind,
    title: t(`notifications.${kind}.title`, { ns: "common" }),
    body:
      kind === "generic"
        ? t("notifications.generic.test_body", {
            ns: "common",
            defaultValue: "Test notification from Recrest",
          })
        : t(`notifications.${kind}.body`, { ns: "common", repo, number, pr_title }),
    url: kind === "generic" ? null : "https://example.com/pr/42",
  });
}

function TestButton({ kind, show }: { kind: NotificationKind; show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <button
      type="button"
      className="r-btn"
      onClick={() => {
        void sendDemoNotification(kind, t);
        toast.success(t("notifications.test_sent", { defaultValue: "Test notification sent" }));
      }}
      aria-label={t("notifications.test", { defaultValue: "Send test notification" })}
      data-testid={`notifications-test-${kind}`}
      title={t("notifications.test", { defaultValue: "Send test notification" })}
    >
      <Send className="h-3 w-3" aria-hidden />
      <span className="ml-1 text-[11px]">{t("notifications.test", { defaultValue: "Test" })}</span>
    </button>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation("settings");
  const n = useAppSelector((state) => state.settings.notifications);
  const save = useSettingsSaver();
  const disabled = !isTauri();

  const update = (patch: Partial<typeof n>) => {
    void save({ notifications: { ...n, ...patch } });
  };

  // Control is the test-button + switch pair. Button hidden when the switch
  // is off (the rule is meaningless when a channel is silenced). Master
  // switch gets the `generic` kind so the test fires only when master is on.
  return (
    <SettingsSection title={t("sections.notifications")}>
      <SettingsField
        label={t("notifications.enabled")}
        description={t("notifications.enabled_desc")}
      >
        <div className="flex items-center gap-2">
          <TestButton kind="generic" show={n.enabled && !disabled} />
          <Switch
            checked={n.enabled}
            disabled={disabled}
            onCheckedChange={(v) => update({ enabled: v })}
            aria-label={t("notifications.enabled")}
            data-testid="settings-notifications-master"
          />
        </div>
      </SettingsField>
      <SettingsField label={t("notifications.new_pr")}>
        <div className="flex items-center gap-2">
          <TestButton kind="new_pr" show={n.enabled && n.newPr && !disabled} />
          <Switch
            checked={n.newPr}
            disabled={disabled || !n.enabled}
            onCheckedChange={(v) => update({ newPr: v })}
            aria-label={t("notifications.new_pr")}
            data-testid="settings-notifications-new-pr"
          />
        </div>
      </SettingsField>
      <SettingsField label={t("notifications.ci_failed")}>
        <div className="flex items-center gap-2">
          <TestButton kind="ci_failed" show={n.enabled && n.ciFailed && !disabled} />
          <Switch
            checked={n.ciFailed}
            disabled={disabled || !n.enabled}
            onCheckedChange={(v) => update({ ciFailed: v })}
            aria-label={t("notifications.ci_failed")}
            data-testid="settings-notifications-ci-failed"
          />
        </div>
      </SettingsField>
      <SettingsField label={t("notifications.merge_ready")}>
        <div className="flex items-center gap-2">
          <TestButton kind="merge_ready" show={n.enabled && n.mergeReady && !disabled} />
          <Switch
            checked={n.mergeReady}
            disabled={disabled || !n.enabled}
            onCheckedChange={(v) => update({ mergeReady: v })}
            aria-label={t("notifications.merge_ready")}
            data-testid="settings-notifications-merge-ready"
          />
        </div>
      </SettingsField>
    </SettingsSection>
  );
}
