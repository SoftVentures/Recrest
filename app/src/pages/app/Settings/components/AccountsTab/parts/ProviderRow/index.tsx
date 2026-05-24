import { type ReactNode, useState } from "react";

import { useTranslation } from "react-i18next";

import { ExternalLink, Link as LinkIcon } from "lucide-react";

import {
  PROVIDER_API_URLS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";
import {
  ActionGroup,
  ApiChange,
  ApiCode,
  ApiLabel,
  ApiRow,
  BitbucketGlyph,
  BrandName,
  Btn,
  Card,
  Field,
  Form,
  FormHint,
  GithubGlyph,
  GitlabGlyph,
  InputRow,
  Label,
  Scope,
  Scopes,
  ScopesLabel,
  Spacer,
  StatusPill,
  TextInput,
  TopRow,
  Username,
} from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow/ProviderRow.styles";
import { useAppSelector } from "@/store/hooks";

const PROVIDER_BRANDS: Record<ProviderId, ReactNode> = {
  github: <GithubGlyph size={16} />,
  gitlab: <GitlabGlyph size={16} />,
  bitbucket: <BitbucketGlyph size={16} />,
};

const BASE_URL_PLACEHOLDERS: Record<ProviderId, string> = {
  github: "https://github.example.com/api/v3",
  gitlab: "https://gitlab.example.com/api/v4",
  bitbucket: "https://bitbucket.example.com/2.0",
};

export interface ProviderRowProps {
  providerId: ProviderId;
}

export function ProviderRow({ providerId }: ProviderRowProps) {
  const { t } = useTranslation();
  const connection = useAppSelector((s) => s.providers.connections[providerId]);
  const connected = !!connection?.connected;
  const isSelfHosted =
    !!connection?.baseUrl &&
    connection.baseUrl.trim().length > 0 &&
    connection.baseUrl !== PROVIDER_API_URLS[providerId];

  const [tokenExpanded, setTokenExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [baseUrlExpanded, setBaseUrlExpanded] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState("");

  const requiresUsername = providerId === Provider.BITBUCKET;
  const effectiveBaseUrl = connection?.baseUrl ?? PROVIDER_API_URLS[providerId];
  const providerName = PROVIDER_NAMES[providerId];

  const closeForms = () => {
    setTokenExpanded(false);
    setBaseUrlExpanded(false);
    setToken("");
    setUsername("");
    setBaseUrlDraft("");
  };

  return (
    <Card>
      <TopRow>
        {PROVIDER_BRANDS[providerId]}
        <BrandName component="span" variant="caption">
          {providerName}
        </BrandName>
        <StatusPill tone={connected ? "connected" : "disconnected"}>
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
            <Btn type="button" variant="outline">
              {t("settings.providers.disconnect")}
            </Btn>
          ) : tokenExpanded ? null : (
            <>
              {connection?.supportsOauth && (
                <Btn type="button" variant="outline">
                  <ExternalLink size={11} />
                  {t("settings.providers.connect_browser")}
                </Btn>
              )}
              <Btn type="button" onClick={() => setTokenExpanded(true)}>
                <LinkIcon size={11} />
                {t("settings.providers.connect_with", { name: providerName })}
              </Btn>
            </>
          )}
        </ActionGroup>
      </TopRow>

      {connected && connection?.username && <Username>{connection.username}</Username>}

      <ApiRow>
        <ApiLabel component="span" variant="caption">
          {t("settings.providers.base_url_label")}:
        </ApiLabel>
        <ApiCode component="code">{effectiveBaseUrl}</ApiCode>
        <ApiChange
          component="a"
          onClick={() => {
            setBaseUrlDraft(isSelfHosted ? effectiveBaseUrl : "");
            setBaseUrlExpanded(true);
          }}
        >
          {t("settings.providers.edit_base_url")}
        </ApiChange>
      </ApiRow>

      {baseUrlExpanded && (
        <Form>
          <FormHint component="p" variant="body2">
            {t("settings.providers.base_url_hint")}
          </FormHint>
          <InputRow>
            <TextInput
              type="url"
              value={baseUrlDraft}
              onChange={(e) => setBaseUrlDraft(e.target.value)}
              placeholder={BASE_URL_PLACEHOLDERS[providerId]}
              autoFocus
            />
            <Btn type="button">{t("settings.providers.save")}</Btn>
            <Btn type="button" variant="ghost" onClick={closeForms}>
              {t("actions.cancel")}
            </Btn>
          </InputRow>
        </Form>
      )}

      {tokenExpanded && !connected && (
        <Form>
          <FormHint component="p" variant="body2">
            {t("settings.providers.paste_here")}
          </FormHint>
          <Scopes>
            <ScopesLabel component="span" variant="caption">
              {t("settings.providers.required_scopes")}:
            </ScopesLabel>
            {PROVIDER_OAUTH_SCOPES[providerId].map((s) => (
              <Scope key={s} component="code">
                {s}
              </Scope>
            ))}
            {providerId === Provider.BITBUCKET && (
              <FormHint component="span" variant="body2">
                {t("settings.providers.bitbucket_scope_note")}
              </FormHint>
            )}
          </Scopes>
          {requiresUsername && (
            <Field>
              <Label>{t("settings.providers.bitbucket_username_label")}</Label>
              <TextInput
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.providers.bitbucket_username_placeholder")}
                autoComplete="username"
                autoFocus
              />
              <FormHint component="p" variant="body2">
                {t("settings.providers.bitbucket_username_hint")}
              </FormHint>
            </Field>
          )}
          <InputRow>
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("settings.providers.token_placeholder")}
              autoFocus={!requiresUsername}
            />
            <Btn type="button" disabled={!token.trim() || (requiresUsername && !username.trim())}>
              {t("settings.providers.save")}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeForms}>
              {t("actions.cancel")}
            </Btn>
          </InputRow>
        </Form>
      )}
    </Card>
  );
}

export default ProviderRow;
