import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Info } from "lucide-react";

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
import { TEST_IDS } from "@/lib/constants/testIds.constants";

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

/**
 * Optional provider connection. We deliberately keep the wizard slim: the
 * full PAT / OAuth flow lives in Settings, so this step just informs the
 * user that local-only mode is fine and offers a single "Skip" path. Future
 * iteration can swap in the connect-button stack from Settings without
 * touching the wizard routing.
 */
function ConnectProviderStep({ onBack, onNext }: ConnectProviderStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
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
        <SkipHint component="p">{t("connectProvider.skip_and_continue")}</SkipHint>
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          data-testid={TEST_IDS.onboarding.providerBack}
        >
          {t("connectProvider.back")}
        </GeneralButton>
        <GeneralButton
          variant="outline"
          onClick={onNext}
          data-testid={TEST_IDS.onboarding.providerSkip}
        >
          {t("connectProvider.skip")}
        </GeneralButton>
        <GeneralButton onClick={onNext} data-testid={TEST_IDS.onboarding.providerNext}>
          {t("connectProvider.continue")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default ConnectProviderStep;
