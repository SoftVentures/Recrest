import { type ReactNode, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { type ProviderPingResult, type ProviderVerifyError, TauriCommand } from "@recrest/shared";

import type { TFunction } from "i18next";
import { Link as LinkIcon, PlugZap, RotateCcw } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import PatHelpPanel from "@/components/molecules/PatHelpPanel";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import {
  PROVIDER_API_URLS,
  PROVIDER_BASE_URL_PLACEHOLDERS,
  PROVIDER_NAMES,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke } from "@/lib/tauri";
import { normalizeProviderBaseUrl } from "@/lib/utils/url.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import {
  ActionGroup,
  ApiChange,
  ApiCode,
  ApiLabel,
  ApiRow,
  BitbucketGlyph,
  BrandName,
  Card,
  ErrorText,
  Field,
  Form,
  FormHint,
  GithubGlyph,
  GitlabGlyph,
  InputRow,
  SaveRow,
  Spacer,
  StatusPill,
  SuccessText,
  TextInput,
  TopRow,
  Username,
} from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow/ProviderRow.styles";
import {
  clearProviderToken,
  loadProviders,
  saveProviderCredentials,
  verifyProviderCredentials,
} from "@/store/actions/providers.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const PROVIDER_BRANDS: Record<ProviderId, ReactNode> = {
  github: <GithubGlyph size={16} />,
  gitlab: <GitlabGlyph size={16} />,
  bitbucket: <BitbucketGlyph size={16} />,
};

function errorMessage(err: ProviderVerifyError, t: TFunction): string {
  switch (err.kind) {
    case "network-unreachable":
      return t("settings.providers.error.network", { detail: err.message });
    case "tls-error":
      return t("settings.providers.error.tls");
    case "unauthorized":
      return t("settings.providers.error.unauthorized");
    case "forbidden":
      return t("settings.providers.error.forbidden", { detail: err.message });
    case "server-error":
      return t("settings.providers.error.server", { status: err.status });
    case "not-provider-response":
      return t("settings.providers.error.not_provider", { hint: err.hint });
    case "unknown":
    default:
      return t("settings.providers.error.unknown", {
        detail: (err as { message?: string }).message ?? "",
      });
  }
}

export interface ProviderRowProps {
  providerId: ProviderId;
}

export function ProviderRow({ providerId }: ProviderRowProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.providers.connections[providerId]);
  const connected = !!connection?.connected;
  const defaultBaseUrl = PROVIDER_API_URLS[providerId];
  const effectiveBaseUrl = connection?.baseUrl ?? defaultBaseUrl;
  const isSelfHosted =
    !!connection?.baseUrl &&
    connection.baseUrl.trim().length > 0 &&
    connection.baseUrl !== defaultBaseUrl;
  const providerName = PROVIDER_NAMES[providerId];
  const requiresUsername = providerId === Provider.BITBUCKET;

  // Single consolidated form state. Open by default when the provider is
  // disconnected so the user has somewhere to paste their PAT.
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  // Pre-fill with the saved/effective URL when the user already configured a
  // self-hosted endpoint so they can edit it directly. Empty draft == "cloud"
  // (we send `null` for cloud).
  const [baseUrlDraft, setBaseUrlDraft] = useState<string>(isSelfHosted ? effectiveBaseUrl : "");
  const [verifyError, setVerifyError] = useState<ProviderVerifyError | null>(null);
  const [verifiedLogin, setVerifiedLogin] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const saveFeedback = useActionFeedback();
  const verifyFeedback = useActionFeedback();
  const pingFeedback = useActionFeedback();
  const [pingMessage, setPingMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Keep the URL draft in sync if the connection state mutates externally
  // (e.g. another tab persisted a base URL via the wizard).
  useEffect(() => {
    setBaseUrlDraft(isSelfHosted ? effectiveBaseUrl : "");
  }, [isSelfHosted, effectiveBaseUrl]);

  const closeForm = () => {
    setOpen(false);
    setToken("");
    setUsername("");
    setVerifyError(null);
    setVerifiedLogin(null);
  };

  const baseUrlForRequest = (): string | null => {
    const trimmed = baseUrlDraft.trim();
    if (trimmed.length === 0) return null;
    if (trimmed === defaultBaseUrl) return null;
    return trimmed;
  };

  const canSubmit = (): boolean => {
    if (!token.trim()) return false;
    if (requiresUsername && !username.trim()) return false;
    return true;
  };

  const onSave = async () => {
    setVerifyError(null);
    setVerifiedLogin(null);
    try {
      const result = await saveFeedback.run(() =>
        dispatch(
          saveProviderCredentials({
            providerId,
            baseUrl: baseUrlForRequest(),
            token: token.trim(),
            username: requiresUsername ? username.trim() : null,
          }),
        ).unwrap(),
      );
      setVerifiedLogin(result.account.login);
      void dispatch(loadProviders());
      // Close the form on success — the row collapses to the connected state.
      // Keep the success text visible by deferring close to next tick.
      setTimeout(() => closeForm(), 1500);
    } catch (err) {
      setVerifyError(err as ProviderVerifyError);
    }
  };

  const onVerify = async () => {
    setVerifyError(null);
    setVerifiedLogin(null);
    try {
      const account = await verifyFeedback.run(() =>
        dispatch(
          verifyProviderCredentials({
            providerId,
            baseUrl: baseUrlForRequest(),
            token: token.trim(),
            username: requiresUsername ? username.trim() : null,
          }),
        ).unwrap(),
      );
      setVerifiedLogin(account.login);
    } catch (err) {
      setVerifyError(err as ProviderVerifyError);
    }
  };

  const onResetBaseUrl = () => {
    setBaseUrlDraft("");
    setVerifyError(null);
    setVerifiedLogin(null);
    setPingMessage(null);
  };

  const onTestConnection = async () => {
    setPingMessage(null);
    setVerifyError(null);
    setVerifiedLogin(null);
    const raw = baseUrlDraft.trim().length > 0 ? baseUrlDraft : defaultBaseUrl;
    const normalized = normalizeProviderBaseUrl(raw);
    try {
      await pingFeedback.run(async () => {
        const result = await invoke<ProviderPingResult>(TauriCommand.PING_PROVIDER, {
          provider: providerId,
          baseUrl: normalized,
        });
        // Reflect the semantic outcome on the button: a reachable-but-bad ping
        // is still a failure for the user, not a success. Throw so the hook
        // flips feedbackState to "error" (red cross) instead of "success".
        if (!result.reachable) {
          setPingMessage({ tone: "error", text: t("settings.providers.test.unreachable") });
          throw new Error("ping-unreachable");
        }
        if (!result.looksLikeProvider) {
          setPingMessage({
            tone: "error",
            text: t("settings.providers.test.not_provider", { providerName }),
          });
          throw new Error("ping-not-provider");
        }
        setPingMessage({
          tone: "success",
          text: result.version
            ? t("settings.providers.test.ok_version", {
                providerName,
                version: result.version,
              })
            : t("settings.providers.test.ok", { providerName }),
        });
        return result;
      });
    } catch (e) {
      // Inner throws ("ping-unreachable"/"ping-not-provider") already set the
      // message. IPC-level rejections (e.g. tauri-ipc-unavailable) land here
      // with no prior message → surface the generic unreachable text.
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "ping-unreachable" && msg !== "ping-not-provider") {
        setPingMessage({ tone: "error", text: t("settings.providers.test.unreachable") });
      }
    }
  };

  const onDisconnect = async () => {
    setConfirmDisconnect(false);
    setVerifyError(null);
    setVerifiedLogin(null);
    try {
      await dispatch(clearProviderToken(providerId)).unwrap();
    } catch {
      // Slice surfaces the rejection; nothing to do inline.
    }
  };

  const submitting = saveFeedback.state === "loading" || verifyFeedback.state === "loading";

  return (
    <Card data-testid={TEST_IDS.settings.accounts.providerRow(providerId)}>
      <TopRow>
        {PROVIDER_BRANDS[providerId]}
        <BrandName component="span" variant="caption">
          {providerName}
        </BrandName>
        <StatusPill
          tone={connected ? "connected" : "disconnected"}
          data-testid={TEST_IDS.settings.accounts.statusPill(providerId)}
        >
          {connected
            ? t("settings.providers.status_connected")
            : t("settings.providers.status_disconnected")}
        </StatusPill>
        {isSelfHosted && (
          <StatusPill tone="self-hosted">{t("settings.providers.self_hosted")}</StatusPill>
        )}
        <Spacer component="span" />
        <ActionGroup>
          {connected ? (
            <GeneralButton
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setConfirmDisconnect(true)}
            >
              {t("settings.providers.disconnect")}
            </GeneralButton>
          ) : open ? null : (
            <GeneralButton
              variant="default"
              size="sm"
              startIcon={<LinkIcon size={11} />}
              onClick={() => setOpen(true)}
              data-testid={TEST_IDS.settings.accounts.connectButton}
            >
              {t("settings.providers.connect_with", { name: providerName })}
            </GeneralButton>
          )}
        </ActionGroup>
      </TopRow>

      {connected && connection?.username && <Username>{connection.username}</Username>}

      {!(open && !connected) && (
        <ApiRow>
          <ApiLabel component="span" variant="caption">
            {t("settings.providers.base_url_label")}:
          </ApiLabel>
          <ApiCode component="code">{effectiveBaseUrl}</ApiCode>
          {!connected && !open && (
            <ApiChange component="a" onClick={() => setOpen(true)}>
              {t("settings.providers.edit_base_url")}
            </ApiChange>
          )}
        </ApiRow>
      )}

      {open && !connected && (
        <Form>
          <Field>
            <InputRow>
              <TextInput
                id={`provider-${providerId}-base-url`}
                label={t("settings.providers.base_url_label")}
                type="url"
                size="small"
                value={baseUrlDraft || defaultBaseUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  // Treat exact-match-of-default as cloud (= empty draft).
                  setBaseUrlDraft(v === defaultBaseUrl ? "" : v);
                  setPingMessage(null);
                }}
                placeholder={PROVIDER_BASE_URL_PLACEHOLDERS[providerId]}
                spellCheck={false}
                fullWidth
                slotProps={{
                  htmlInput: { "data-testid": TEST_IDS.settings.accounts.baseUrlInput },
                }}
              />
              <GeneralButton
                variant="outline"
                startIcon={<PlugZap size={14} />}
                onClick={() => void onTestConnection()}
                disabled={pingFeedback.state === "loading"}
                feedbackState={pingFeedback.state}
                loading={pingFeedback.state === "loading"}
                data-testid={TEST_IDS.settings.accounts.testConnection}
              >
                {t("settings.providers.test_connection")}
              </GeneralButton>
              {baseUrlDraft.trim().length > 0 && baseUrlDraft !== defaultBaseUrl && (
                <GeneralButton
                  variant="outline"
                  startIcon={<RotateCcw size={14} />}
                  onClick={onResetBaseUrl}
                  data-testid={TEST_IDS.settings.accounts.baseUrlReset}
                >
                  {t("settings.providers.back_to_default")}
                </GeneralButton>
              )}
            </InputRow>
            {pingMessage &&
              (pingMessage.tone === "success" ? (
                <SuccessText component="p">{pingMessage.text}</SuccessText>
              ) : (
                <ErrorText component="p">{pingMessage.text}</ErrorText>
              ))}
          </Field>

          <PatHelpPanel
            provider={providerId}
            baseUrl={baseUrlDraft.trim().length > 0 ? baseUrlDraft : effectiveBaseUrl}
          />

          {requiresUsername && (
            <Field>
              <TextInput
                id={`provider-${providerId}-username`}
                label={t("settings.providers.bitbucket_username_label")}
                type="text"
                size="small"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.providers.bitbucket_username_placeholder")}
                autoComplete="username"
                slotProps={{
                  htmlInput: { "data-testid": TEST_IDS.settings.accounts.usernameInput },
                }}
              />
              <FormHint component="p" variant="body2">
                {t("settings.providers.bitbucket_username_hint")}
              </FormHint>
            </Field>
          )}

          <Field>
            <TextInput
              id={`provider-${providerId}-token`}
              label={t("settings.providers.paste_here")}
              type="password"
              size="small"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit() && !submitting) {
                  e.preventDefault();
                  void onSave();
                }
              }}
              placeholder={t("settings.providers.token_placeholder")}
              autoComplete="off"
              spellCheck={false}
              slotProps={{
                htmlInput: { "data-testid": TEST_IDS.settings.accounts.tokenInput },
              }}
            />
          </Field>

          {verifyError && (
            <ErrorText component="p" data-testid={TEST_IDS.settings.accounts.errorMessage}>
              {errorMessage(verifyError, t)}
            </ErrorText>
          )}
          {!verifyError && verifiedLogin && (
            <SuccessText component="p">
              {t("settings.providers.verified_as", { login: verifiedLogin })}
            </SuccessText>
          )}

          <SaveRow>
            <GeneralButton variant="ghost" size="sm" onClick={closeForm} disabled={submitting}>
              {t("actions.cancel")}
            </GeneralButton>
            <GeneralButton
              variant="outline"
              size="sm"
              onClick={() => void onVerify()}
              disabled={submitting || !canSubmit()}
              feedbackState={verifyFeedback.state}
              loading={verifyFeedback.state === "loading"}
              data-testid={TEST_IDS.settings.accounts.verifyButton}
            >
              {t("settings.providers.verify")}
            </GeneralButton>
            <GeneralButton
              variant="default"
              size="sm"
              onClick={() => void onSave()}
              disabled={submitting || !canSubmit()}
              feedbackState={saveFeedback.state}
              loading={saveFeedback.state === "loading"}
              data-testid={TEST_IDS.settings.accounts.tokenSave}
            >
              {t("settings.providers.save")}
            </GeneralButton>
          </SaveRow>
        </Form>
      )}
      <ConfirmationModal
        open={confirmDisconnect}
        destructive
        title={t("settings.providers.disconnect_confirm_title", { name: providerName })}
        description={t("settings.providers.disconnect_confirm_description", { name: providerName })}
        confirmLabel={t("settings.providers.disconnect_confirm_action")}
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => void onDisconnect()}
      />
    </Card>
  );
}

export default ProviderRow;
