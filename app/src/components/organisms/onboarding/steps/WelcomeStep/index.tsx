import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import Logo from "@/components/atoms/brand/Logo";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import {
  StepContent,
  StepFooter,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface WelcomeStepProps {
  onNext: () => void;
}

const Hero = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 16,
  paddingTop: 24,
  paddingBottom: 16,
  flex: 1,
  justifyContent: "center",
}) as typeof Box;

const LogoSlot = styled(Logo)({
  width: 72,
  height: 72,
});

const Tagline = styled(Box)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  maxWidth: 420,
  lineHeight: 1.5,
})) as typeof Box;

function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.WELCOME)}>
      <StepContent>
        <Hero>
          <LogoSlot title={t("welcome.title")} />
          <StepTitle component="h1">{t("welcome.title")}</StepTitle>
          <Tagline component="p">{t("welcome.tagline")}</Tagline>
        </Hero>
      </StepContent>
      <StepFooter>
        <GeneralButton onClick={onNext} data-testid={TEST_IDS.onboarding.welcomeNext}>
          {t("welcome.cta")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default WelcomeStep;
