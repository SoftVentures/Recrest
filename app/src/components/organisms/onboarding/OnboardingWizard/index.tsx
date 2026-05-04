import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Dialog, DialogContent } from "@/components/molecules/compounds/Dialog";
import { BasicsStep } from "@/components/organisms/onboarding/steps/BasicsStep";
import { ConnectProviderStep } from "@/components/organisms/onboarding/steps/ConnectProviderStep";
import { DoneStep } from "@/components/organisms/onboarding/steps/DoneStep";
import { InitialScanStep } from "@/components/organisms/onboarding/steps/InitialScanStep";
import { PickFolderStep } from "@/components/organisms/onboarding/steps/PickFolderStep";
import { WelcomeStep } from "@/components/organisms/onboarding/steps/WelcomeStep";
import { useFirstRun } from "@/hooks/useFirstRun";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

const STEPS = ["welcome", "basics", "folders", "provider", "scan", "done"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const { shouldShow, dismiss } = useFirstRun();
  const [step, setStep] = useState<Step>("welcome");
  // Plan 1 §D.4: stack of previously-visited steps so any step can pop
  // back without each step needing to know what came before it. We hold
  // it in a ref so `goBack` can read+pop without StrictMode running our
  // updater twice and double-firing setStep.
  const historyRef = useRef<Step[]>([]);
  const [active, setActive] = useState(false);
  const settingsLoaded = useAppSelector((s) => !s.settings.loading);
  const { t } = useTranslation();

  // Latch: once the wizard starts we stay open even if the first-run
  // conditions flip mid-flow (e.g. saving a scan path from inside the
  // wizard would otherwise unmount us mid-click).
  useEffect(() => {
    if (settingsLoaded && shouldShow && !active) setActive(true);
  }, [settingsLoaded, shouldShow, active]);

  if (!active) return null;

  const goTo = (next: Step) => {
    historyRef.current = [...historyRef.current, step];
    setStep(next);
  };
  const goBack = () => {
    const prev = historyRef.current;
    if (prev.length === 0) return;
    const last = prev[prev.length - 1]!;
    historyRef.current = prev.slice(0, -1);
    setStep(last);
  };
  const finish = () => {
    dismiss();
    setActive(false);
  };

  const idx = STEPS.indexOf(step);

  return (
    <Dialog open>
      <DialogContent
        className="max-w-xl sm:max-w-xl"
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        aria-label={t("app.name", { ns: "common" })}
      >
        <StepIndicator current={idx} total={STEPS.length} />

        {step === "welcome" && <WelcomeStep onNext={() => goTo("basics")} />}
        {/* `goBack` is the same callback for every step; it pops the history
         * stack and is a no-op when the stack is empty. Passed unconditionally
         * so the steps don't have to handle a missing callback. */}
        {step === "basics" && <BasicsStep onBack={goBack} onNext={() => goTo("folders")} />}
        {step === "folders" && <PickFolderStep onBack={goBack} onNext={() => goTo("provider")} />}
        {step === "provider" && <ConnectProviderStep onBack={goBack} onNext={() => goTo("scan")} />}
        {step === "scan" && <InitialScanStep onBack={goBack} onNext={() => goTo("done")} />}
        {step === "done" && <DoneStep onFinish={finish} />}
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}
