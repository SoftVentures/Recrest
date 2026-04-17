import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useFirstRun } from "@/hooks/useFirstRun";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

import { BasicsStep } from "./steps/BasicsStep";
import { ConnectProviderStep } from "./steps/ConnectProviderStep";
import { DoneStep } from "./steps/DoneStep";
import { InitialScanStep } from "./steps/InitialScanStep";
import { PickFolderStep } from "./steps/PickFolderStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const STEPS = [
  "welcome",
  "basics",
  "folders",
  "provider",
  "scan",
  "done",
] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const { shouldShow, dismiss } = useFirstRun();
  const [step, setStep] = useState<Step>("welcome");
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

  const goTo = (next: Step) => setStep(next);
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
        {step === "basics" && (
          <BasicsStep onBack={() => goTo("welcome")} onNext={() => goTo("folders")} />
        )}
        {step === "folders" && (
          <PickFolderStep onBack={() => goTo("basics")} onNext={() => goTo("provider")} />
        )}
        {step === "provider" && (
          <ConnectProviderStep onBack={() => goTo("folders")} onNext={() => goTo("scan")} />
        )}
        {step === "scan" && (
          <InitialScanStep onBack={() => goTo("provider")} onNext={() => goTo("done")} />
        )}
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
