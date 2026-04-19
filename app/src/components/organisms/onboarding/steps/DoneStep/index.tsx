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
  onFinish: () => void;
}

export function DoneStep({ onFinish }: Props) {
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
        <Button onClick={onFinish}>{t("done.cta")}</Button>
      </DialogFooter>
    </>
  );
}
