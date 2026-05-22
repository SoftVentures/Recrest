import { type ReactNode, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PROVIDER_API_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  PROVIDER_OAUTH_SCOPES,
  type ProviderId,
} from "@recrest/shared";

import { ExternalLink, Link as LinkIcon } from "lucide-react";

import { useAppSelector } from "@/store/hooks";

/* ─── Brand glyphs (inline SVG so we don't pull in another dep) ───────── */

function GithubGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function GitlabGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="#FC6D26"
        d="m23.6 9.6-.03-.08L20.3.6a.9.9 0 0 0-.84-.6.86.86 0 0 0-.85.6L15.5 9.3H8.5L5.4.6A.86.86 0 0 0 4.55 0a.9.9 0 0 0-.86.6L.43 9.5l-.03.08a6.2 6.2 0 0 0 2.06 7.16l.02.01.03.02 5.08 3.81 2.5 1.9 1.54 1.16a1 1 0 0 0 1.22 0l1.54-1.16 2.5-1.9 5.1-3.83.02-.01A6.2 6.2 0 0 0 23.6 9.6z"
      />
      <path fill="#E24329" d="M12 22.86 14.93 13.7H9.08z" />
      <path fill="#FC6D26" d="M12 22.86 9.08 13.7H4.98z" />
      <path fill="#FCA326" d="m4.98 13.7-.89 2.74a.61.61 0 0 0 .22.68L12 22.85z" />
      <path fill="#E24329" d="M4.98 13.7h4.1L7.32 8.32a.31.31 0 0 0-.6 0z" />
      <path fill="#FC6D26" d="M12 22.86 14.93 13.7h4.1z" />
      <path fill="#FCA326" d="m19.03 13.7.89 2.74a.61.61 0 0 1-.22.68L12 22.86z" />
      <path fill="#E24329" d="M19.03 13.7h-4.1l1.76-5.38a.31.31 0 0 1 .6 0z" />
    </svg>
  );
}

function BitbucketGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="#2684FF"
        d="M.78 1A.77.77 0 0 0 0 1.92l3.27 19.74a1.05 1.05 0 0 0 1.03.87h15.7a.77.77 0 0 0 .77-.64L24 1.93a.77.77 0 0 0-.77-.92zm13.62 14.21H9.62l-1.3-6.78h7.27z"
      />
    </svg>
  );
}

/* ─── Styled primitives ──────────────────────────────────────────────── */

const Section = styled("section")({
  marginBottom: 22,
});

const SectionLabel = styled("h3")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

const SectionDesc = styled("p")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  margin: "0 0 10px 2px",
}));

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 10,
}));

const TopRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const BrandName = styled("span")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const StatusPill = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "connected" | "disconnected" | "self-hosted";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 7px",
  borderRadius: 100,
  color:
    tone === "connected"
      ? theme.palette.success.dark
      : tone === "self-hosted"
        ? theme.palette.warning.dark
        : theme.palette.text.information,
  backgroundColor:
    tone === "connected"
      ? `color-mix(in srgb, ${theme.palette.success.main} 18%, transparent)`
      : tone === "self-hosted"
        ? `color-mix(in srgb, ${theme.palette.warning.main} 22%, transparent)`
        : theme.palette.surface.interface.backElevation,
}));

const Spacer = styled("span")({ flex: 1 });

const ActionGroup = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

const Btn = styled("button", { shouldForwardProp: (p) => p !== "variant" })<{
  variant?: "primary" | "ghost" | "outline";
}>(({ theme, variant }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  border:
    variant === "outline"
      ? `1px solid ${theme.palette.divider}`
      : variant === "ghost"
        ? `1px solid transparent`
        : `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor:
    variant === "outline"
      ? theme.palette.surface.interface.base
      : variant === "ghost"
        ? "transparent"
        : theme.palette.surface.button.cta,
  color:
    variant === "outline"
      ? theme.palette.text.primary
      : variant === "ghost"
        ? theme.palette.text.secondary
        : theme.palette.surface.button.ctaContrast,
  "&:hover": {
    backgroundColor:
      variant === "outline"
        ? theme.palette.surface.interface.active
        : variant === "ghost"
          ? theme.palette.surface.interface.active
          : theme.palette.surface.button.ctaHover,
    borderColor:
      variant === "outline" || variant === "ghost"
        ? theme.palette.border.hover
        : theme.palette.surface.button.ctaHover,
  },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
}));

const Username = styled("div")(({ theme }) => ({
  marginTop: 6,
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const ApiRow = styled("div")(({ theme }) => ({
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11.5,
  color: theme.palette.text.information,
  flexWrap: "wrap",
}));

const ApiLabel = styled("span")({ fontWeight: 500 });

const ApiCode = styled("code")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11.5,
  padding: "3px 8px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
}));

const ApiChange = styled("a")(({ theme }) => ({
  color: theme.palette.primary.dark,
  cursor: "pointer",
  fontSize: 11.5,
  textDecoration: "underline",
  textUnderlineOffset: 2,
  "&:hover": { textDecoration: "none" },
}));

const Form = styled(Box)(({ theme }) => ({
  marginTop: 10,
  paddingTop: 10,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}));

const FormHint = styled("p")(({ theme }) => ({
  margin: 0,
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const Scopes = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  fontSize: 11,
});

const ScopesLabel = styled("span")(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const Scope = styled("code")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 10.5,
  padding: "2px 6px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.secondary,
}));

const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const Label = styled("label")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

const TextInput = styled("input")(({ theme }) => ({
  width: "100%",
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

const InputRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

/* ─── Provider card ─── */

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

interface ProviderRowProps {
  providerId: ProviderId;
}

function ProviderRow({ providerId }: ProviderRowProps) {
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

  const requiresUsername = providerId === "bitbucket";
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
        <BrandName>{providerName}</BrandName>
        <StatusPill tone={connected ? "connected" : "disconnected"}>
          {connected
            ? t("settings.providers.status_connected", { defaultValue: "Connected" })
            : t("settings.providers.status_disconnected", { defaultValue: "Not connected" })}
        </StatusPill>
        {isSelfHosted && (
          <StatusPill tone="self-hosted">
            {t("settings.providers.self_hosted", { defaultValue: "Self-hosted" })}
          </StatusPill>
        )}
        <Spacer />
        <ActionGroup>
          {connected ? (
            <Btn type="button" variant="outline">
              {t("settings.providers.disconnect", { defaultValue: "Disconnect" })}
            </Btn>
          ) : tokenExpanded ? null : (
            <>
              {connection?.supportsOauth && (
                <Btn type="button" variant="outline">
                  <ExternalLink size={11} />
                  {t("settings.providers.connect_browser", {
                    defaultValue: "Connect via browser",
                  })}
                </Btn>
              )}
              <Btn type="button" onClick={() => setTokenExpanded(true)}>
                <LinkIcon size={11} />
                {t("settings.providers.connect_with", {
                  name: providerName,
                  defaultValue: `Connect ${providerName}`,
                })}
              </Btn>
            </>
          )}
        </ActionGroup>
      </TopRow>

      {connected && connection?.username && <Username>{connection.username}</Username>}

      <ApiRow>
        <ApiLabel>
          {t("settings.providers.base_url_label", { defaultValue: "API base URL" })}:
        </ApiLabel>
        <ApiCode>{effectiveBaseUrl}</ApiCode>
        <ApiChange
          onClick={() => {
            setBaseUrlDraft(isSelfHosted ? effectiveBaseUrl : "");
            setBaseUrlExpanded(true);
          }}
        >
          {t("settings.providers.edit_base_url", { defaultValue: "Change API base URL" })}
        </ApiChange>
      </ApiRow>

      {baseUrlExpanded && (
        <Form>
          <FormHint>
            {t("settings.providers.base_url_hint", {
              defaultValue:
                "Override only if you self-host. Leave empty to revert to the default endpoint.",
            })}
          </FormHint>
          <InputRow>
            <TextInput
              type="url"
              value={baseUrlDraft}
              onChange={(e) => setBaseUrlDraft(e.target.value)}
              placeholder={BASE_URL_PLACEHOLDERS[providerId]}
              autoFocus
            />
            <Btn type="button">{t("settings.providers.save", { defaultValue: "Save" })}</Btn>
            <Btn type="button" variant="ghost" onClick={closeForms}>
              {t("actions.cancel", { defaultValue: "Cancel" })}
            </Btn>
          </InputRow>
        </Form>
      )}

      {tokenExpanded && !connected && (
        <Form>
          <FormHint>
            {t("settings.providers.paste_here", {
              defaultValue:
                "Paste the token you just created — we store it encrypted in your OS keychain.",
            })}
          </FormHint>
          <Scopes>
            <ScopesLabel>
              {t("settings.providers.required_scopes", { defaultValue: "Required scopes" })}:
            </ScopesLabel>
            {PROVIDER_OAUTH_SCOPES[providerId].map((s) => (
              <Scope key={s}>{s}</Scope>
            ))}
            {providerId === "bitbucket" && (
              <FormHint as="span">
                {t("settings.providers.bitbucket_scope_note", {
                  defaultValue:
                    "Bitbucket requires selecting these manually in the app-password form.",
                })}
              </FormHint>
            )}
          </Scopes>
          {requiresUsername && (
            <Field>
              <Label>
                {t("settings.providers.bitbucket_username_label", {
                  defaultValue: "Bitbucket username",
                })}
              </Label>
              <TextInput
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.providers.bitbucket_username_placeholder", {
                  defaultValue: "your-bitbucket-username",
                })}
                autoComplete="username"
                autoFocus
              />
              <FormHint>
                {t("settings.providers.bitbucket_username_hint", {
                  defaultValue: "Bitbucket app-passwords require the username separately.",
                })}
              </FormHint>
            </Field>
          )}
          <InputRow>
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("settings.providers.token_placeholder", {
                defaultValue: "Paste your personal access token",
              })}
              autoFocus={!requiresUsername}
            />
            <Btn type="button" disabled={!token.trim() || (requiresUsername && !username.trim())}>
              {t("settings.providers.save", { defaultValue: "Save" })}
            </Btn>
            <Btn type="button" variant="ghost" onClick={closeForms}>
              {t("actions.cancel", { defaultValue: "Cancel" })}
            </Btn>
          </InputRow>
        </Form>
      )}
    </Card>
  );
}

export function AccountsSection() {
  const { t } = useTranslation();
  return (
    <Section>
      <SectionLabel>{t("settings.accounts.providers", { defaultValue: "Providers" })}</SectionLabel>
      <SectionDesc>
        {t("settings.accounts.providers_sub", {
          defaultValue: "Connect a Personal Access Token to list merge requests.",
        })}
      </SectionDesc>
      {PROVIDER_IDS.map((id) => (
        <ProviderRow key={id} providerId={id} />
      ))}
    </Section>
  );
}
