/**
 * Onboarding wizard step identifiers — the canonical ordering for the
 * first-run flow. Used by `OnboardingWizard` (routing between steps), each
 * step component (`data-testid`), and the developer "Retrigger onboarding"
 * affordance.
 *
 * Add a new step by extending `ONBOARDING_STEPS` (the order is what the
 * wizard advances through) and adding a matching component under
 * `components/organisms/onboarding/steps/<Name>Step/`. The progress bar in
 * `OnboardingWizard` derives its dot count from the array length, so no
 * additional plumbing is needed.
 */
export const OnboardingStep = {
  WELCOME: "welcome",
  BASICS: "basics",
  FOLDERS: "folders",
  PROVIDER: "provider",
  /** Conditionally inserted after PROVIDER when the user selected GitLab.
   *  Resolves cloud vs self-hosted + verifies a self-hosted URL is reachable. */
  GITLAB_VARIANT: "gitlab-variant",
  SCAN: "scan",
  DONE: "done",
} as const;

export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

/**
 * Canonical step list — also drives the progress-dot count in the wizard.
 * The GitLab variant step is *not* listed here because it doesn't get a dot:
 * it only appears for users who picked GitLab and would otherwise inflate
 * the progress count for everyone else.
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  OnboardingStep.WELCOME,
  OnboardingStep.BASICS,
  OnboardingStep.FOLDERS,
  OnboardingStep.PROVIDER,
  OnboardingStep.SCAN,
  OnboardingStep.DONE,
] as const;
