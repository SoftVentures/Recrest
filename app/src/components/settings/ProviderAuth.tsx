import { useState } from "react";

import { useTranslation } from "react-i18next";

import {
  PROVIDER_CREATE_TOKEN_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  type ProviderId,
} from "@recrest/shared";

import { Icon } from "@/components/icons/Icon";
import { SettingsSection } from "@/components/settings/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProviderToken, setProviderToken } from "@/store/slices/providersSlice";

export function ProviderAuth() {
  const { t } = useTranslation("settings");
  return (
    <SettingsSection title={t("sections.providers")} description={t("providers.description")}>
      {PROVIDER_IDS.map((id) => (
        <ProviderRow key={id} providerId={id} />
      ))}
    </SettingsSection>
  );
}

function ProviderRow({ providerId }: { providerId: ProviderId }) {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.providers.connections[providerId]);
  const [token, setToken] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const connected = connection?.connected ?? false;
  const providerName = PROVIDER_NAMES[providerId];

  const handleConnect = async () => {
    if (!token.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(setProviderToken({ providerId, token: token.trim() })).unwrap();
      setToken("");
      setExpanded(false);
      toast.success(t("providers.connected", { name: providerName }));
    } catch {
      toast.error(t("unauthorized", { ns: "errors" }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(clearProviderToken(providerId)).unwrap();
      toast.success(t("providers.disconnected", { name: providerName }));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  const openTokenPage = () => {
    void openExternal(PROVIDER_CREATE_TOKEN_URLS[providerId]);
    setExpanded(true);
  };

  return (
    <div className="a-set-row a-prov-row">
      <div className="a-set-row-l a-prov-body">
        <div className="a-prov-head">
          <Icon name={providerId === "github" ? "github" : "git"} size={16} />
          <span className="a-prov-name">{providerName}</span>
          <span className={connected ? "a-prov-state connected" : "a-prov-state"}>
            {connected ? t("providers.status_connected") : t("providers.status_disconnected")}
          </span>
        </div>
        {connected && connection?.username && (
          <div className="a-prov-user">{connection.username}</div>
        )}
        {expanded && !connected && (
          <div className="a-prov-form">
            <p className="a-prov-hint">
              {t("providers.paste_here", {
                defaultValue:
                  "Paste the token you just created — we store it encrypted in your OS keychain.",
              })}
            </p>
            <div className="a-prov-input-row">
              <input
                type="password"
                className="a-set-input a-prov-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("providers.token_placeholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleConnect();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                className="r-btn primary"
                disabled={!token.trim() || submitting}
                onClick={() => void handleConnect()}
              >
                {submitting
                  ? t("providers.connecting", { defaultValue: "Connecting…" })
                  : t("providers.save", { defaultValue: "Save" })}
              </button>
              <button
                type="button"
                className="r-btn ghost"
                onClick={() => {
                  setExpanded(false);
                  setToken("");
                }}
              >
                {t("actions.cancel", { ns: "common" })}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="a-set-row-r a-prov-actions">
        {connected ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="r-btn">
                {t("providers.disconnect")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("providers.confirm_disconnect_title", { name: providerName })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("providers.confirm_disconnect_desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("actions.cancel", { ns: "common" })}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleDisconnect()}>
                  {t("providers.disconnect")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : !expanded ? (
          <button type="button" className="r-btn primary" onClick={openTokenPage}>
            <Icon name="external" size={12} />
            {t("providers.connect_with", {
              name: providerName,
              defaultValue: "Connect {{name}}",
            })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
