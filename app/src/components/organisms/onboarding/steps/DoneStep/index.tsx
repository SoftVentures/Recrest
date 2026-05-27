import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import Mascot from "@/components/atoms/brand/Mascot";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import {
  StepBody,
  StepContent,
  StepFooter,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface DoneStepProps {
  onFinish: () => void;
}

const Celebrate = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 14,
  paddingTop: 24,
  paddingBottom: 16,
  flex: 1,
  justifyContent: "center",
}) as typeof Box;

const Body = styled(StepBody)({
  textAlign: "center",
  maxWidth: 380,
}) as typeof StepBody;

function DoneStep({ onFinish }: DoneStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.DONE)}>
      <StepContent>
        <Celebrate>
          <Mascot variant="celebrating" size={104} title={t("done.title")} />
          <StepTitle component="h1">{t("done.title")}</StepTitle>
          <Body component="p">{t("done.body")}</Body>
        </Celebrate>
      </StepContent>
      <StepFooter>
        <GeneralButton onClick={onFinish} data-testid={TEST_IDS.onboarding.doneFinish}>
          {t("done.cta")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default DoneStep;
