import { useEffect, useState } from "react";

import { CheckCircle2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/atoms/Button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { scanForRepos } from "@/store/slices/reposSlice";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function InitialScanStep({ onBack, onNext }: Props) {
  const { t } = useTranslation("onboarding");
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [scanning, setScanning] = useState(true);
  const [foundCount, setFoundCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const repos = await dispatch(scanForRepos(scanPaths)).unwrap();
        if (!cancelled) setFoundCount(repos.length);
      } catch {
        if (!cancelled) setFoundCount(0);
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, scanPaths]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("scan.title")}</DialogTitle>
        <DialogDescription>
          {scanning
            ? t("scan.scanning")
            : foundCount === 0
              ? t("scan.empty")
              : t("scan.summary", {
                  count: foundCount ?? 0,
                  pathCount: scanPaths.length,
                })}
        </DialogDescription>
      </DialogHeader>

      <div
        className="flex flex-col items-center justify-center gap-3 py-6"
        data-testid="onboarding-scan-icon"
      >
        {scanning ? (
          // W.5: replace the previous Spinner+Search stack with a single
          // animated Search icon. The bouncing skeleton box looked broken;
          // a pulsing search glyph reads as "searching" without ambiguity.
          <Search
            className="h-10 w-10 text-primary motion-safe:animate-pulse"
            aria-hidden
            data-testid="onboarding-scan-spinner"
          />
        ) : (
          <CheckCircle2
            className={
              foundCount === 0 ? "h-10 w-10 text-muted-foreground" : "h-10 w-10 text-status-success"
            }
            aria-hidden
          />
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onBack} disabled={scanning}>
          {t("scan.back")}
        </Button>
        <Button onClick={onNext} disabled={scanning}>
          {t("scan.next")}
        </Button>
      </DialogFooter>
    </>
  );
}
