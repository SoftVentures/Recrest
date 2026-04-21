import { useState } from "react";

import { useTranslation } from "react-i18next";

import {
  PROVIDER_API_URLS,
  PROVIDER_CREATE_TOKEN_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  type ProviderId,
  TauriCommand,
} from "@recrest/shared";

import { BrandIcon, type BrandSlug } from "@/components/atoms/BrandIcon";
import { Icon } from "@/components/atoms/Icon";
import { useConfirm } from "@/components/molecules/compounds/ConfirmDialog";
import { TruncatedTooltip } from "@/components/molecules/compounds/TruncatedTooltip";
import { SettingsSection } from "@/components/organisms/settings/SettingsSection";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearProviderToken,
  setProviderBaseUrl,
  setProviderToken,
} from "@/store/slices/providersSlice";

function providerBrand(id: ProviderId): BrandSlug {
  return id;
}

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
  const { confirm, node: confirmNode } = useConfirm();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [baseUrlExpanded, setBaseUrlExpanded] = useState(false);
  const [baseUrlSaving, setBaseUrlSaving] = useState(false);
  const requiresUsername = providerId === "bitbucket";

  const defaultBaseUrl = PROVIDER_API_URLS[providerId];
  const effectiveBaseUrl = connection?.baseUrl ?? defaultBaseUrl;
  const isSelfHosted =
    !!connection?.baseUrl &&
    connection.baseUrl.trim().length > 0 &&
    connection.baseUrl !== defaultBaseUrl;

  const connected = connection?.connected ?? false;
  const providerName = PROVIDER_NAMES[providerId];

  const handleConnect = async () => {
    if (!token.trim()) return;
    if (requiresUsername && !username.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(
        setProviderToken({
          providerId,
          token: token.trim(),
          username: requiresUsername ? username.trim() : null,
        }),
      ).unwrap();
      setToken("");
      setUsername("");
      setExpanded(false);
      toast.success(t("providers.connected", { name: providerName }));
    } catch {
      toast.error(t("unauthorized", { ns: "errors" }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: t("providers.confirm_disconnect_title", { name: providerName }),
      description: t("providers.confirm_disconnect_desc"),
      confirmLabel: t("providers.disconnect"),
      tone: "destructive",
      rememberKey: `provider-disconnect:${providerId}`,
    });
    if (!ok) return;
    try {
      await dispatch(clearProviderToken(providerId)).unwrap();
      toast.success(t("providers.disconnected", { name: providerName }));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  const handleSaveBaseUrl = async () => {
    setBaseUrlSaving(true);
    try {
      const trimmed = baseUrlDraft.trim();
      const nextValue = trimmed.length === 0 || trimmed === defaultBaseUrl ? null : trimmed;
      await dispatch(setProviderBaseUrl({ providerId, baseUrl: nextValue })).unwrap();
      setBaseUrlExpanded(false);
      setBaseUrlDraft("");
      toast.success(t("providers.base_url_saved", { defaultValue: "API base URL saved." }));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    } finally {
      setBaseUrlSaving(false);
    }
  };

  const openBaseUrlForm = () => {
    setBaseUrlDraft(isSelfHosted && connection?.baseUrl ? connection.baseUrl : "");
    setBaseUrlExpanded(true);
  };

  const openTokenPage = () => {
    void openExternal(PROVIDER_CREATE_TOKEN_URLS[providerId]);
    setExpanded(true);
  };

  return (
    <div className="a-set-row a-prov-row">
      <div className="a-set-row-l a-prov-body">
        <div className="a-prov-head">
          <BrandIcon slug={providerBrand(providerId)} size={16} color="brand" />
          <span className="a-prov-name">{providerName}</span>
          <span className={connected ? "a-prov-state connected" : "a-prov-state"}>
            {connected ? t("providers.status_connected") : t("providers.status_disconnected")}
          </span>
          {isSelfHosted && (
            <TruncatedTooltip content={effectiveBaseUrl}>
              <span className="a-prov-selfhosted">{t("providers.self_hosted")}</span>
            </TruncatedTooltip>
          )}
        </div>
        {connected && connection?.username && (
          <div className="a-prov-user">{connection.username}</div>
        )}
        <div className="a-prov-baseurl">
          <span className="a-prov-baseurl-lbl">{t("providers.base_url_label")}:</span>
          <code className="a-prov-baseurl-val">{effectiveBaseUrl}</code>
          <button type="button" className="a-prov-baseurl-edit" onClick={openBaseUrlForm}>
            {t("providers.edit_base_url")}
          </button>
        </div>
        {baseUrlExpanded && (
          <div className="a-prov-form">
            <p className="a-prov-hint">{t("providers.base_url_hint")}</p>
            <div className="a-prov-input-row">
              <input
                type="url"
                className="a-set-input a-prov-input"
                value={baseUrlDraft}
                onChange={(e) => setBaseUrlDraft(e.target.value)}
                placeholder={t(`providers.base_url_placeholder_${providerId}` as const)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveBaseUrl();
                  }
                }}
              />
              <button
                type="button"
                className="r-btn primary"
                disabled={baseUrlSaving}
                onClick={() => void handleSaveBaseUrl()}
              >
                {baseUrlSaving
                  ? t("providers.connecting", { defaultValue: "Connecting…" })
                  : t("providers.save", { defaultValue: "Save" })}
              </button>
              <button
                type="button"
                className="r-btn ghost"
                onClick={() => {
                  setBaseUrlExpanded(false);
                  setBaseUrlDraft("");
                }}
              >
                {t("actions.cancel", { ns: "common" })}
              </button>
            </div>
          </div>
        )}
        {expanded && !connected && (
          <div className="a-prov-form">
            <p className="a-prov-hint">
              {t("providers.paste_here", {
                defaultValue:
                  "Paste the token you just created — we store it encrypted in your OS keychain.",
              })}
            </p>
            <div className="a-prov-scopes">
              <span className="a-prov-scopes-lbl">
                {t("providers.required_scopes", { defaultValue: "Required scopes" })}:
              </span>
              {PROVIDER_OAUTH_SCOPES[providerId].map((s) => (
                <code key={s} className="a-prov-scope">
                  {s}
                </code>
              ))}
              {providerId === "bitbucket" && (
                <span className="a-prov-scopes-note">
                  {t("providers.bitbucket_scope_note", {
                    defaultValue:
                      "Bitbucket requires selecting these manually in the app-password form.",
                  })}
                </span>
              )}
            </div>
            {requiresUsername && (
              <div className="a-prov-field">
                <label className="a-prov-flabel">{t("providers.bitbucket_username_label")}</label>
                <input
                  type="text"
                  className="a-set-input a-prov-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("providers.bitbucket_username_placeholder")}
                  autoComplete="username"
                  autoFocus
                />
                <p className="a-prov-hint small">{t("providers.bitbucket_username_hint")}</p>
              </div>
            )}
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
                autoFocus={!requiresUsername}
              />
              <button
                type="button"
                className="r-btn primary"
                disabled={!token.trim() || (requiresUsername && !username.trim()) || submitting}
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
                  setUsername("");
                }}
              >
                {t("actions.cancel", { ns: "common" })}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="a-set-row-r a-prov-actions">
        {confirmNode}
        {connected ? (
          <button type="button" className="r-btn" onClick={() => void handleDisconnect()}>
            {t("providers.disconnect")}
          </button>
        ) : !expanded ? (
          <div className="flex gap-2">
            {connection?.supportsOauth && (
              <button
                type="button"
                className="r-btn"
                onClick={() => {
                  void invoke(TauriCommand.BEGIN_OAUTH, { providerId }).catch(() => {
                    toast.error(
                      t("providers.oauth_failed", {
                        defaultValue: "Could not start OAuth flow",
                      }),
                    );
                  });
                }}
              >
                <Icon name="external" size={12} />
                {t("providers.connect_browser", { defaultValue: "Connect via browser" })}
              </button>
            )}
            <button type="button" className="r-btn primary" onClick={openTokenPage}>
              <Icon name="external" size={12} />
              {t("providers.connect_with", {
                name: providerName,
                defaultValue: "Connect {{name}}",
              })}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
