import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand } from "@recrest/shared";

import { Send } from "lucide-react";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const NotificationKind = {
  NEW_PR: "new_pr",
  CI_FAILED: "ci_failed",
  MERGE_READY: "merge_ready",
  GENERIC: "generic",
} as const;
type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

async function sendTestNotification(kind: NotificationKind): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke(TauriCommand.NOTIFY, {
      kind,
      title:
        kind === NotificationKind.NEW_PR
          ? "New merge request"
          : kind === NotificationKind.CI_FAILED
            ? "CI failed"
            : kind === NotificationKind.MERGE_READY
              ? "Ready to merge"
              : "Recrest",
      body: "This is a test notification from Recrest settings.",
    });
  } catch (err) {
    console.warn("[settings] test notification failed", err);
  }
}

const InlineRow = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const TestBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 28,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

export function NotificationsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enabled, newPr, ciFailed, mergeReady } = useAppSelector((s) => s.settings.notifications);
  const setEnabled = (v: boolean) => dispatch(setNotificationsEnabled(v));
  const setNewPr = (v: boolean) => dispatch(setNotificationsNewPr(v));
  const setCiFailed = (v: boolean) => dispatch(setNotificationsCiFailed(v));
  const setMergeReady = (v: boolean) => dispatch(setNotificationsMergeReady(v));

  const TestPair = ({
    checked,
    onChange,
    show,
    testId,
    kind,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    show: boolean;
    testId: string;
    kind: NotificationKind;
    label: string;
  }) => (
    <InlineRow>
      {show && (
        <TestBtn
          type="button"
          aria-label={t("settings.send_test_notification", { ns: I18nNamespace.ARIA })}
          onClick={() => void sendTestNotification(kind)}
        >
          <Send size={11} /> {t("notifications_test_button", { ns: I18nNamespace.SETTINGS })}
        </TestBtn>
      )}
      <GeneralSwitchInput
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        data-testid={TEST_IDS.settings.general.notifications(testId)}
      />
    </InlineRow>
  );

  return (
    <SettingsSection title={t("settings.sections.notifications")}>
      <SettingsRow
        label={t("settings.notifications.enabled")}
        sub={t("settings.notifications.enabled_desc")}
      >
        <InlineRow>
          {enabled && (
            <TestBtn
              type="button"
              aria-label={t("settings.send_test_notification", { ns: I18nNamespace.ARIA })}
              onClick={() => void sendTestNotification(NotificationKind.GENERIC)}
            >
              <Send size={11} /> {t("notifications_test_button", { ns: I18nNamespace.SETTINGS })}
            </TestBtn>
          )}
          <GeneralSwitchInput
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={t("settings.notifications.enabled")}
            data-testid={TEST_IDS.settings.general.notificationsMaster}
          />
        </InlineRow>
      </SettingsRow>
      {enabled && (
        <>
          <SettingsRow label={t("settings.notifications.new_pr")}>
            <TestPair
              checked={newPr}
              onChange={setNewPr}
              show={newPr}
              testId={TEST_IDS.settings.general.notificationsField.newPr}
              kind={NotificationKind.NEW_PR}
              label={t("settings.notifications.new_pr")}
            />
          </SettingsRow>
          <SettingsRow label={t("settings.notifications.ci_failed")}>
            <TestPair
              checked={ciFailed}
              onChange={setCiFailed}
              show={ciFailed}
              testId={TEST_IDS.settings.general.notificationsField.ciFailed}
              kind={NotificationKind.CI_FAILED}
              label={t("settings.notifications.ci_failed")}
            />
          </SettingsRow>
          <SettingsRow label={t("settings.notifications.merge_ready")}>
            <TestPair
              checked={mergeReady}
              onChange={setMergeReady}
              show={mergeReady}
              testId={TEST_IDS.settings.general.notificationsField.mergeReady}
              kind={NotificationKind.MERGE_READY}
              label={t("settings.notifications.merge_ready")}
            />
          </SettingsRow>
        </>
      )}
    </SettingsSection>
  );
}

export default NotificationsSection;
