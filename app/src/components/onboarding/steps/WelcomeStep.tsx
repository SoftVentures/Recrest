import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: Props) {
  const { t } = useTranslation("onboarding");
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <DialogTitle>{t("welcome.title")}</DialogTitle>
            <DialogDescription className="mt-1">
              {t("welcome.tagline")}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t("welcome.body")}</p>
      <DialogFooter>
        <Button onClick={onNext}>
          {t("welcome.cta")}
          <ArrowRight aria-hidden />
        </Button>
      </DialogFooter>
    </>
  );
}
