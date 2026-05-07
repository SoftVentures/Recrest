import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/atoms/Button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";

interface Props {
  onBack: () => void;
  onFinish: () => void;
}

export function DoneStep({ onBack, onFinish }: Props) {
  const { t } = useTranslation("onboarding");
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("done.title")}</DialogTitle>
        <DialogDescription>{t("done.body")}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-center py-6">
        <CheckCircle2 className="h-14 w-14 text-status-success" aria-hidden />
      </div>
      <DialogFooter>
        {/* W.6: every non-welcome step now exposes Back so the user can
         *  amend earlier choices without restarting onboarding. The history
         *  stack in OnboardingWizard already preserves form state.
         *  M9: `done.back` exists in both en and de locales — no defaultValue
         *  fallback chain needed (was a leftover from the `welcome.back`-
         *  only era). */}
        <Button variant="ghost" onClick={onBack}>
          {t("done.back")}
        </Button>
        <Button onClick={onFinish}>{t("done.cta")}</Button>
      </DialogFooter>
    </>
  );
}
