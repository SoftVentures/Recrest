import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Check, Info, PlugZap, Server } from "lucide-react";

import BrandIcon from "@/assets/icons/BrandIcon";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import PatHelpPanel from "@/components/molecules/PatHelpPanel";
import {
  StepBody,
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import {
  PROVIDER_API_URLS,
  PROVIDER_IDS,
  PROVIDER_NAMES,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { setProviderBaseUrl, setProviderToken } from "@/store/actions/providers.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export interface ConnectProviderStepProps {
  onBack: () => void;
  onNext: () => void;
  /** Notifies the wizard which provider the user has highlighted. The wizard
   *  uses this to decide whether the next step is `GitlabVariantStep`. */
  onProviderChange?: (providerId: ProviderId) => void;
  initialProviderId?: ProviderId;
}

// Self-hosted base-URL placeholders mirror the Settings → Accounts editor: the
// stored value is the REST API root, so the example carries the API path.
const BASE_URL_PLACEHOLDERS: Record<ProviderId, string> = {
  github: "https://github.example.com/api/v3",
  gitlab: "https://gitlab.example.com/api/v4",
  bitbucket: "https://bitbucket.example.com/2.0",
};

const Note = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.25),
  fontSize: fontPxToRem(12),
  lineHeight: 1.55,
  color: theme.palette.text.primary,
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: theme.spacing(1.5),
})) as typeof Box;

const NoteIcon = styled(Box)(({ theme }) => ({
  color: theme.palette.icon.information,
  flexShrink: 0,
  display: "inline-flex",
  paddingTop: pxToRem(2),
})) as typeof Box;

const SkipHint = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  textAlign: "center",
})) as typeof Typography;

const ProviderRow = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  flexWrap: "wrap",
})) as typeof Box;

interface PickerProps {
  active: boolean;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> required for accessibility (focus/keyboard)
const ProviderPicker = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<PickerProps>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(8),
  padding: pxToRems(8, 12),
  borderRadius: 8,
  border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
  background: active ? theme.palette.surface.interface.active : theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  cursor: "pointer",
  flex: "0 0 auto",
  "&:hover": {
    borderColor: theme.palette.border.hover,
    background: theme.palette.surface.interface.active,
  },
}));

const Form = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
})) as typeof Box;

// Field left, action button(s) right — the standard "input + adjacent action"
// row used across the wizard (mirrors PickFolderStep).
const InputRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
})) as typeof Box;

const Field = styled(TextField)({
  flex: 1,
  minWidth: 0,
});

const LinkRow = styled(Box)({
  display: "flex",
  justifyContent: "flex-start",
}) as typeof Box;

const Hint = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  lineHeight: 1.5,
})) as typeof Typography;

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: toneText(theme, StatusTone.ERROR),
})) as typeof Typography;

const ConnectedBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  fontSize: fontPxToRem(12),
  fontWeight: 600,
  color: toneText(theme, StatusTone.SUCCESS),
})) as typeof Box;

function ConnectProviderStep({
  onBack,
  onNext,
  onProviderChange,
  initialProviderId,
}: ConnectProviderStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();
  const connections = useAppSelector((s) => s.providers.connections);

  const [providerId, setProviderId] = useState<ProviderId>(initialProviderId ?? Provider.GITHUB);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [baseUrlExpanded, setBaseUrlExpanded] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectFeedback = useActionFeedback();

  const connection = connections[providerId];
  const connected = !!connection?.connected;
  const anyConnected = PROVIDER_IDS.some((id) => connections[id]?.connected);
  const providerName = PROVIDER_NAMES[providerId];

  // Bitbucket authenticates an app password against a username; GitHub/GitLab
  // tokens carry their own identity, so the field only shows for Bitbucket.
  const requiresUsername = providerId === Provider.BITBUCKET;
  const effectiveBaseUrl = connection?.baseUrl ?? PROVIDER_API_URLS[providerId];
  const isSelfHosted =
    !!connection?.baseUrl && connection.baseUrl !== PROVIDER_API_URLS[providerId];

  // Reset the per-provider form when the user switches the active tab so a
  // GitHub token can't accidentally be submitted against GitLab.
  const selectProvider = (id: ProviderId) => {
    setProviderId(id);
    setToken("");
    setUsername("");
    setBaseUrlExpanded(false);
    setBaseUrlDraft("");
    setError(null);
    onProviderChange?.(id);
  };

  const cancelBaseUrl = () => {
    setBaseUrlExpanded(false);
    setBaseUrlDraft("");
  };

  const onSaveBaseUrl = async () => {
    const next = baseUrlDraft.trim();
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        setProviderBaseUrl({ providerId, baseUrl: next.length > 0 ? next : null }),
      ).unwrap();
      setBaseUrlExpanded(false);
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("connectProvider.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onConnect = async () => {
    if (!token.trim()) return;
    if (requiresUsername && !username.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await connectFeedback.run(async () => {
        await dispatch(
          setProviderToken({
            providerId,
            token: token.trim(),
            username: requiresUsername ? username.trim() : null,
          }),
        ).unwrap();
      });
      setToken("");
      setUsername("");
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("connectProvider.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.PROVIDER)}>
      <StepHead>
        <StepTitle component="h1">{t("connectProvider.title")}</StepTitle>
        <StepBody component="p">{t("connectProvider.body")}</StepBody>
      </StepHead>
      <StepContent>
        <Note>
          <NoteIcon component="span">
            <Info size={pxToRem(14)} />
          </NoteIcon>
          <Typography component="span">{t("connectProvider.local_note")}</Typography>
        </Note>

        <ProviderRow>
          {PROVIDER_IDS.map((id) => (
            <ProviderPicker
              key={id}
              type="button"
              active={providerId === id}
              onClick={() => selectProvider(id)}
              data-testid={TEST_IDS.onboarding.providerPick(id)}
            >
              {/* GitHub's brand mark is near-black, so keep it theme-aware
                  (currentColor); GitLab/Bitbucket render in their brand hue. */}
              <BrandIcon
                slug={id}
                size={14}
                color={id === Provider.GITHUB ? "currentColor" : "brand"}
              />
              <Box component="span">{PROVIDER_NAMES[id]}</Box>
            </ProviderPicker>
          ))}
        </ProviderRow>

        {connected ? (
          <ConnectedBadge data-testid={TEST_IDS.onboarding.providerConnected}>
            <Check size={pxToRem(14)} />
            {t("connectProvider.connected", { name: providerName })}
          </ConnectedBadge>
        ) : (
          <Form>
            {baseUrlExpanded ? (
              <>
                <InputRow>
                  <Field
                    size="small"
                    type="url"
                    autoFocus
                    spellCheck={false}
                    value={baseUrlDraft}
                    onChange={(e) => setBaseUrlDraft(e.target.value)}
                    placeholder={BASE_URL_PLACEHOLDERS[providerId]}
                    slotProps={{
                      htmlInput: { "data-testid": TEST_IDS.onboarding.providerBaseUrl },
                    }}
                  />
                  <GeneralButton
                    variant="outline"
                    onClick={() => void onSaveBaseUrl()}
                    loading={submitting}
                    data-testid={TEST_IDS.onboarding.providerBaseUrlSave}
                  >
                    {t("connectProvider.base_url_save")}
                  </GeneralButton>
                  <GeneralButton variant="ghost" onClick={cancelBaseUrl} disabled={submitting}>
                    {t("connectProvider.base_url_cancel")}
                  </GeneralButton>
                </InputRow>
                <Hint component="p">
                  {t("connectProvider.base_url_hint", { name: providerName })}
                </Hint>
              </>
            ) : (
              <LinkRow>
                <GeneralButton
                  variant="link"
                  size="sm"
                  startIcon={<Server size={pxToRem(12)} />}
                  onClick={() => {
                    setBaseUrlDraft(isSelfHosted ? effectiveBaseUrl : "");
                    setBaseUrlExpanded(true);
                  }}
                  data-testid={TEST_IDS.onboarding.providerSelfHosted}
                >
                  {t("connectProvider.self_hosted", { name: providerName })}
                </GeneralButton>
              </LinkRow>
            )}

            {requiresUsername && (
              <Field
                size="small"
                type="text"
                autoComplete="username"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("connectProvider.username_placeholder")}
                slotProps={{
                  htmlInput: { "data-testid": TEST_IDS.onboarding.providerUsername },
                }}
              />
            )}

            <InputRow>
              <Field
                size="small"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onConnect();
                  }
                }}
                placeholder={t(
                  requiresUsername
                    ? "connectProvider.app_password_placeholder"
                    : "connectProvider.token_placeholder",
                )}
                slotProps={{
                  htmlInput: { "data-testid": TEST_IDS.onboarding.providerToken },
                }}
              />
              <GeneralButton
                variant="default"
                startIcon={<PlugZap size={pxToRem(14)} />}
                onClick={() => void onConnect()}
                loading={submitting}
                feedbackState={connectFeedback.state}
                disabled={!token.trim() || submitting || (requiresUsername && !username.trim())}
                data-testid={TEST_IDS.onboarding.providerConnect}
              >
                {t("connectProvider.connect")}
              </GeneralButton>
            </InputRow>

            <PatHelpPanel provider={providerId} baseUrl={connection?.baseUrl ?? ""} />

            {error && <ErrorText component="p">{error}</ErrorText>}
          </Form>
        )}

        {!anyConnected && (
          <SkipHint component="p">{t("connectProvider.skip_and_continue")}</SkipHint>
        )}
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          data-testid={TEST_IDS.onboarding.providerBack}
        >
          {t("connectProvider.back")}
        </GeneralButton>
        {!anyConnected && (
          <GeneralButton
            variant="outline"
            onClick={onNext}
            data-testid={TEST_IDS.onboarding.providerSkip}
          >
            {t("connectProvider.skip")}
          </GeneralButton>
        )}
        <GeneralButton onClick={onNext} data-testid={TEST_IDS.onboarding.providerNext}>
          {t("connectProvider.continue")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default ConnectProviderStep;
