import { useEffect, useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralModal from "@/components/molecules/modals/GeneralModal";
import BasicsStep from "@/components/organisms/onboarding/steps/BasicsStep";
import ConnectProviderStep from "@/components/organisms/onboarding/steps/ConnectProviderStep";
import DoneStep from "@/components/organisms/onboarding/steps/DoneStep";
import GitlabVariantStep from "@/components/organisms/onboarding/steps/GitlabVariantStep";
import InitialScanStep from "@/components/organisms/onboarding/steps/InitialScanStep";
import PickFolderStep from "@/components/organisms/onboarding/steps/PickFolderStep";
import WelcomeStep from "@/components/organisms/onboarding/steps/WelcomeStep";
import { useFirstRun } from "@/hooks/useFirstRun";
import { ONBOARDING_STEPS, OnboardingStep } from "@/lib/constants/onboarding.constants";
import { Provider, type ProviderId } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setProviderBaseUrl } from "@/store/actions/providers.actions";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos, scanForRepos } from "@/store/actions/repos.actions";
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
 *
 * `GitlabVariantStep` is inserted between PROVIDER and SCAN only when the
 * user has highlighted the GitLab tab on the Connect step. It doesn't get
 * its own progress dot — it's a contextual sub-step that would otherwise
 * inflate the count for GitHub/Bitbucket users.
 *
 * On finish the wizard dispatches initial-load thunks (repos + activity +
 * PR poll) so the dashboard has live data the moment it appears, instead
 * of the user staring at empty cards while the bootstrap effect catches up.
 */
export function OnboardingWizard() {
  const dispatch = useAppDispatch();
  const { shouldShow, dismiss } = useFirstRun();
  const settingsLoaded = useAppSelector((s) => !s.settings.loading);
  const override = useAppSelector((s) => s.ui.onboardingOverride);
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);
  const repoIds = useAppSelector((s) => Object.keys(s.repos.items));

  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [active, setActive] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(Provider.GITHUB);

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
  const finish = async () => {
    // Mark dismissed first so a slow IPC call can't keep the wizard up.
    dismiss();
    dispatch(setOnboardingOverride(false));
    setActive(false);

    // Kick off the initial-data fetches the user just configured towards.
    // Each dispatch is fire-and-forget — the dashboard hooks (`useRepos`,
    // `useActivityCommits`, `usePrPolling`) subscribe to the same store
    // slices, so anything that lands shows up automatically. A previously-
    // skipped scan now happens here so users that landed on "Skip" in
    // PickFolderStep still get a populated dashboard.
    if (scanPaths.length > 0 && repoIds.length === 0) {
      void dispatch(scanForRepos(scanPaths));
    } else {
      const reposResult = await dispatch(loadRepos());
      // Seed the PR cards with one immediate fetch per repo so the
      // dashboard's MRs panel isn't empty until the next polling tick.
      if (loadRepos.fulfilled.match(reposResult)) {
        for (const r of reposResult.payload) {
          void dispatch(fetchPullRequests(r.id));
        }
      }
    }
    // Activity follows the user's persisted range — `useActivityCommits`
    // requests it as soon as the dashboard mounts, so no explicit dispatch
    // here.
  };

  // GITLAB_VARIANT is shown only for users on the GitLab tab. It sits
  // between PROVIDER and SCAN in the linear flow but isn't part of
  // ONBOARDING_STEPS (so progress dots stay constant across providers).
  const goAfterProvider = () => {
    if (selectedProvider === Provider.GITLAB) {
      goTo(OnboardingStep.GITLAB_VARIANT);
    } else {
      goTo(OnboardingStep.SCAN);
    }
  };

  const idx = ONBOARDING_STEPS.indexOf(step);
  // GITLAB_VARIANT borrows PROVIDER's dot position so the progress bar
  // doesn't snap backwards when the user descends into the sub-step.
  const dotIdx =
    step === OnboardingStep.GITLAB_VARIANT
      ? ONBOARDING_STEPS.indexOf(OnboardingStep.PROVIDER)
      : idx;

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
            aria-valuenow={dotIdx + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS.length}
            data-testid={TEST_IDS.onboarding.progress}
          >
            {ONBOARDING_STEPS.map((s, i) => (
              <Dot key={s} active={i <= dotIdx} />
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
              onNext={goAfterProvider}
              onProviderChange={setSelectedProvider}
              initialProviderId={selectedProvider}
            />
          )}
          {step === OnboardingStep.GITLAB_VARIANT && (
            <GitlabVariantStep
              onBack={() => goTo(OnboardingStep.PROVIDER)}
              onResolved={(baseUrl) => {
                // Persist the resolved API base URL so subsequent PR
                // fetches hit the right endpoint immediately. Fire-and-
                // forget; the user already typed it, so latching it
                // here doesn't need a spinner.
                void dispatch(
                  setProviderBaseUrl({ providerId: Provider.GITLAB, baseUrl: baseUrl || null }),
                );
                goTo(OnboardingStep.SCAN);
              }}
            />
          )}
          {step === OnboardingStep.SCAN && (
            <InitialScanStep
              onBack={() => goTo(OnboardingStep.PROVIDER)}
              onNext={() => goTo(OnboardingStep.DONE)}
            />
          )}
          {step === OnboardingStep.DONE && <DoneStep onFinish={() => void finish()} />}
        </>
      }
    />
  );
}

export default OnboardingWizard;
