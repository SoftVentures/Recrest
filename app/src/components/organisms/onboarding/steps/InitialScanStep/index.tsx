import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import { Search } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import {
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { prefersReducedMotionGuard } from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { scanForRepos } from "@/store/actions/repos.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fontPxToRem, pxToRem } from "@/theme/scale";

export interface InitialScanStepProps {
  onBack: () => void;
  onNext: () => void;
}

const ScanState = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: pxToRem(14),
  paddingTop: pxToRem(32),
  paddingBottom: pxToRem(32),
  flex: 1,
  justifyContent: "center",
}) as typeof Box;

// The magnifier sweeps across the lens area (left → up → right → up …) so the
// scan reads as "looking around" rather than a generic spinner.
const sweep = keyframes`
  0%   { transform: translate(-9px, 2px) rotate(-12deg); }
  25%  { transform: translate(0, -3px) rotate(0deg); }
  50%  { transform: translate(9px, 2px) rotate(12deg); }
  75%  { transform: translate(0, -3px) rotate(0deg); }
  100% { transform: translate(-9px, 2px) rotate(-12deg); }
`;

const ScanArea = styled(Box)(({ theme }) => ({
  width: pxToRem(56),
  height: pxToRem(56),
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  overflow: "hidden",
})) as typeof Box;

const ScanGlass = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  color: theme.palette.primary.main,
  animation: `${sweep} 1.7s ease-in-out infinite`,
  ...prefersReducedMotionGuard,
})) as typeof Box;

const Summary = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(15),
  fontWeight: 600,
  color: theme.palette.text.primary,
  textAlign: "center",
})) as typeof Typography;

const SubSummary = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.information,
  textAlign: "center",
  maxWidth: pxToRem(360),
  lineHeight: 1.5,
})) as typeof Typography;

function InitialScanStep({ onBack, onNext }: InitialScanStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);
  // Select the stable map reference, then derive the array under useMemo — a
  // selector that returns `Object.values(...)` builds a new array every call
  // and makes react-redux warn about an unstable result.
  const reposById = useAppSelector((s) => s.repos.items);
  const repos = useMemo(() => Object.values(reposById), [reposById]);

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
              <ScanArea>
                <ScanGlass>
                  <Search size={pxToRem(26)} strokeWidth={2.25} />
                </ScanGlass>
              </ScanArea>
              <SubSummary component="p">{t("scan.scanning")}</SubSummary>
            </>
          ) : repos.length === 0 ? (
            <SubSummary component="p">{t("scan.empty")}</SubSummary>
          ) : (
            <Summary component="p">
              {t("scan.summary_template", {
                repos: t("scan.summary_repos", { count: repos.length }),
                paths: t("scan.summary_paths", { count: scanPaths.length }),
              })}
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
