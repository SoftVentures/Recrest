import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import {
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { scanForRepos } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface InitialScanStepProps {
  onBack: () => void;
  onNext: () => void;
}

const ScanState = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  paddingTop: 32,
  paddingBottom: 32,
  flex: 1,
  justifyContent: "center",
}) as typeof Box;

const Summary = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 600,
  color: theme.palette.text.primary,
  textAlign: "center",
})) as typeof Typography;

const SubSummary = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.information,
  textAlign: "center",
  maxWidth: 360,
  lineHeight: 1.5,
})) as typeof Typography;

function InitialScanStep({ onBack, onNext }: InitialScanStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);
  const repos = useAppSelector((s) => Object.values(s.repos.items));

  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setScanning(true);
    void (async () => {
      try {
        // Actually walk the filesystem for `.git` entries under the paths
        // the user picked in PickFolderStep. The previous `loadRepos`
        // call only returned what was already persisted in settings.repos —
        // for a fresh onboarding that's always empty, so the step rendered
        // "no repos found" no matter what the user pointed it at.
        await dispatch(scanForRepos(scanPaths)).unwrap();
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, scanPaths]);

  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.SCAN)}>
      <StepHead>
        <StepTitle component="h1">{t("scan.title")}</StepTitle>
      </StepHead>
      <StepContent>
        <ScanState>
          {scanning ? (
            <>
              <GeneralCircularLoader size={CircularLoaderSize.MD} />
              <SubSummary component="p">{t("scan.scanning")}</SubSummary>
            </>
          ) : repos.length === 0 ? (
            <SubSummary component="p">{t("scan.empty")}</SubSummary>
          ) : (
            <Summary component="p">
              {t("scan.summary", { count: repos.length, pathCount: scanPaths.length })}
            </Summary>
          )}
        </ScanState>
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          disabled={scanning}
          data-testid={TEST_IDS.onboarding.scanBack}
        >
          {t("scan.back")}
        </GeneralButton>
        <GeneralButton
          onClick={onNext}
          disabled={scanning}
          data-testid={TEST_IDS.onboarding.scanNext}
        >
          {t("scan.next")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default InitialScanStep;
