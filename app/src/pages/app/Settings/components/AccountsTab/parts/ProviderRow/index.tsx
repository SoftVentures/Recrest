import { type ReactNode, useState } from "react";

import { useTranslation } from "react-i18next";

import { ExternalLink, Link as LinkIcon } from "lucide-react";

import {
  PROVIDER_API_URLS,
  PROVIDER_CREATE_TOKEN_URLS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";
import { openExternal } from "@/lib/tauri";
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
  TokenCreateLink,
  TopRow,
  Username,
} from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow/ProviderRow.styles";
import { useAppSelector } from "@/store/hooks";

/** Returns the host token-creation URL. Self-hosted GitHub/GitLab strip the
 *  API suffix from the stored base URL so users land on the web UI, not the
 *  REST root. Bitbucket Server is out of scope — cloud URL works for all. */
function tokenCreateUrlFor(providerId: ProviderId, baseUrl: string | null | undefined): string {
  const cloud = PROVIDER_CREATE_TOKEN_URLS[providerId];
  if (!baseUrl) return cloud;
  if (providerId === Provider.GITHUB) {
    const m = baseUrl.match(/^(https?:\/\/[^/]+)\/api\/v3\/?$/i);
    if (m?.[1]) return `${m[1]}/settings/tokens/new?scopes=repo,read:user&description=Recrest`;
  }
  if (providerId === Provider.GITLAB) {
    const m = baseUrl.match(/^(https?:\/\/[^/]+)\/api\/v4\/?$/i);
    if (m?.[1]) {
      return `${m[1]}/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_user,read_repository`;
    }
  }
  return cloud;
}

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
            <TokenCreateLink
              type="button"
              onClick={() => void openExternal(tokenCreateUrlFor(providerId, connection?.baseUrl))}
              aria-label={t("settings.providers.token_create_link_aria", { name: providerName })}
            >
              <ExternalLink size={11} />
              {t("settings.providers.token_create_link", { name: providerName })}
            </TokenCreateLink>
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
