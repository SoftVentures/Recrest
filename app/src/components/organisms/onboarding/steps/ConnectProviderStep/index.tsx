import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Check, Info } from "lucide-react";

import BrandIcon from "@/assets/icons/BrandIcon";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
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
  PROVIDER_IDS,
  PROVIDER_NAMES,
  Provider,
  type ProviderId,
} from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { setProviderToken } from "@/store/actions/providers.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface ConnectProviderStepProps {
  onBack: () => void;
  onNext: () => void;
}

const Note = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.25),
  fontSize: 12,
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
  paddingTop: 2,
})) as typeof Box;

const SkipHint = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
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
  disabled?: boolean;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> required for accessibility (focus/keyboard)
const ProviderPicker = styled("button", {
  shouldForwardProp: (p) => p !== "active" && p !== "disabled",
})<PickerProps>(({ theme, active, disabled }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
  background: active ? theme.palette.surface.interface.active : theme.palette.background.paper,
  color: disabled ? theme.palette.text.information : theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  flex: "0 0 auto",
  "&:hover": disabled
    ? undefined
    : {
        borderColor: theme.palette.border.hover,
        background: theme.palette.surface.interface.active,
      },
}));

const Stub = styled(Box)(({ theme }) => ({
  fontSize: 10.5,
  fontWeight: 500,
  color: theme.palette.text.information,
})) as typeof Box;

const Form = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required for password autocomplete + IME
const TokenInput = styled("input")(({ theme }) => ({
  height: 36,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontFamily: MONO_STACK,
  fontSize: 12,
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
  "&::placeholder": { color: theme.palette.text.informationLight },
}));

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: toneText(theme, StatusTone.ERROR),
})) as typeof Typography;

const ConnectedBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: toneText(theme, StatusTone.SUCCESS),
})) as typeof Box;

function ConnectProviderStep({ onBack, onNext }: ConnectProviderStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();
  const connections = useAppSelector((s) => s.providers.connections);

  const [providerId, setProviderId] = useState<ProviderId>(Provider.GITHUB);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = !!connections[providerId]?.connected;
  const anyConnected = PROVIDER_IDS.some((id) => connections[id]?.connected);

  const onConnect = async () => {
    if (!token.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(setProviderToken({ providerId, token: token.trim() })).unwrap();
      setToken("");
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
            <Info size={14} />
          </NoteIcon>
          <Typography component="span">{t("connectProvider.local_note")}</Typography>
        </Note>

        <ProviderRow>
          {PROVIDER_IDS.map((id) => {
            const isStub = id !== Provider.GITHUB;
            return (
              <ProviderPicker
                key={id}
                type="button"
                active={providerId === id}
                disabled={isStub}
                onClick={() => !isStub && setProviderId(id)}
              >
                <BrandIcon slug={id} size={14} />
                <Box component="span">{PROVIDER_NAMES[id]}</Box>
                {isStub && <Stub component="span">soon</Stub>}
              </ProviderPicker>
            );
          })}
        </ProviderRow>

        {connected ? (
          <ConnectedBadge>
            <Check size={14} />
            {t("connectProvider.connected", { name: PROVIDER_NAMES[providerId] })}
          </ConnectedBadge>
        ) : (
          <Form>
            <TokenInput
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("connectProvider.token_placeholder")}
              data-testid={TEST_IDS.onboarding.providerToken}
            />
            {error && <ErrorText component="p">{error}</ErrorText>}
            <GeneralButton
              variant="default"
              onClick={() => void onConnect()}
              loading={submitting}
              disabled={!token.trim() || submitting}
              data-testid={TEST_IDS.onboarding.providerConnect}
            >
              {t("connectProvider.connect")}
            </GeneralButton>
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
