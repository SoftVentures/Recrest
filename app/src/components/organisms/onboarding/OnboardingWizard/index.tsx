import { useEffect, useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralModal from "@/components/molecules/modals/GeneralModal";
import BasicsStep from "@/components/organisms/onboarding/steps/BasicsStep";
import ConnectProviderStep from "@/components/organisms/onboarding/steps/ConnectProviderStep";
import DoneStep from "@/components/organisms/onboarding/steps/DoneStep";
import InitialScanStep from "@/components/organisms/onboarding/steps/InitialScanStep";
import PickFolderStep from "@/components/organisms/onboarding/steps/PickFolderStep";
import WelcomeStep from "@/components/organisms/onboarding/steps/WelcomeStep";
import { useFirstRun } from "@/hooks/useFirstRun";
import { ONBOARDING_STEPS, OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setOnboardingOverride } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Progress = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  marginBottom: theme.spacing(2),
}));

interface DotProps {
  active: boolean;
}

const Dot = styled(Box, { shouldForwardProp: (p) => p !== "active" })<DotProps>(
  ({ theme, active }) => ({
    width: active ? 18 : 8,
    height: 6,
    borderRadius: 3,
    background: active ? theme.palette.primary.main : theme.palette.divider,
    transition: "width 0.2s ease, background 0.2s ease",
  }),
);

/**
 * First-run wizard. Latches `active` on mount: once it starts, mid-flow
 * settings changes (e.g. saving a scan path inside the wizard) don't unmount
 * the dialog underneath the user's click. Each step component owns its own
 * `useEffect`-driven validation and renders Continue/Back; the wizard just
 * routes between them.
 */
export function OnboardingWizard() {
  const dispatch = useAppDispatch();
  const { shouldShow, dismiss } = useFirstRun();
  const settingsLoaded = useAppSelector((s) => !s.settings.loading);
  const override = useAppSelector((s) => s.ui.onboardingOverride);

  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Two activation paths:
    //   (1) First-run heuristics (`shouldShow`) — settings just loaded, no
    //       scanPaths, no providers, not previously dismissed.
    //   (2) Redux override — the dev "Open onboarding wizard" button flips
    //       this on so the wizard appears instantly without a reload, even
    //       on a fully set-up install.
    const shouldOpen = settingsLoaded && (shouldShow || override);
    if (shouldOpen && !active) {
      setActive(true);
      setStep(OnboardingStep.WELCOME);
    }
  }, [settingsLoaded, shouldShow, override, active]);

  if (!active) return null;

  const goTo = (next: OnboardingStep) => setStep(next);
  const finish = () => {
    dismiss();
    dispatch(setOnboardingOverride(false));
    setActive(false);
  };

  const idx = ONBOARDING_STEPS.indexOf(step);

  return (
    <GeneralModal
      open={active}
      modalWidth={620}
      closeIcon={false}
      disableBackdropClick
      data-testid={TEST_IDS.onboarding.root}
      contentChildren={
        <>
          <Progress
            role="progressbar"
            aria-valuenow={idx + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS.length}
            data-testid={TEST_IDS.onboarding.progress}
          >
            {ONBOARDING_STEPS.map((s, i) => (
              <Dot key={s} active={i <= idx} />
            ))}
          </Progress>

          {step === OnboardingStep.WELCOME && (
            <WelcomeStep onNext={() => goTo(OnboardingStep.BASICS)} />
          )}
          {step === OnboardingStep.BASICS && (
            <BasicsStep
              onBack={() => goTo(OnboardingStep.WELCOME)}
              onNext={() => goTo(OnboardingStep.FOLDERS)}
            />
          )}
          {step === OnboardingStep.FOLDERS && (
            <PickFolderStep
              onBack={() => goTo(OnboardingStep.BASICS)}
              onNext={() => goTo(OnboardingStep.PROVIDER)}
            />
          )}
          {step === OnboardingStep.PROVIDER && (
            <ConnectProviderStep
              onBack={() => goTo(OnboardingStep.FOLDERS)}
              onNext={() => goTo(OnboardingStep.SCAN)}
            />
          )}
          {step === OnboardingStep.SCAN && (
            <InitialScanStep
              onBack={() => goTo(OnboardingStep.PROVIDER)}
              onNext={() => goTo(OnboardingStep.DONE)}
            />
          )}
          {step === OnboardingStep.DONE && <DoneStep onFinish={finish} />}
        </>
      }
    />
  );
}

export default OnboardingWizard;
