import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import {
  StepBody,
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import { setScanPaths } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface PickFolderStepProps {
  onBack: () => void;
  onNext: () => void;
}

const InputRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const Input = styled(TextField)({
  flex: 1,
});

const PathList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  maxHeight: 200,
  overflowY: "auto",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
}));

const PathRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1),
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: 12,
  "&:last-child": { borderBottom: 0 },
  "&:hover": { background: theme.palette.surface.interface.active },
}));

const PathText = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: MONO_STACK,
  color: theme.palette.text.secondary,
})) as typeof Box;

const Empty = styled(Typography)(({ theme }) => ({
  borderRadius: 8,
  border: `1px dashed ${theme.palette.divider}`,
  padding: `${theme.spacing(3)} ${theme.spacing(2)}`,
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Typography;

function PickFolderStep({ onBack, onNext }: PickFolderStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const dispatch = useAppDispatch();
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = async (next: string[]) => {
    // Mirror to repos slice immediately so the list reflects the change
    // without waiting on the backend round-trip; saveSettings then persists
    // the value (and in dev:web feeds the in-memory stub).
    dispatch(setScanPaths(next));
    try {
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
    } catch {
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
    }
  };

  const addPath = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed || scanPaths.includes(trimmed)) return;
    setBusy(true);
    try {
      await persist([...scanPaths, trimmed]);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const removePath = async (path: string) => {
    await persist(scanPaths.filter((p: string) => p !== path));
  };

  const browse = async () => {
    if (!isTauri()) return;
    setBusy(true);
    try {
      // Browse adds the picked folder immediately — saves a click compared to
      // the older "fill input, then Add" two-step flow.
      const selected = await pickFolder(draft.trim() || undefined);
      if (selected) await addPath(selected);
    } finally {
      setBusy(false);
    }
  };

  const empty = scanPaths.length === 0;

  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.FOLDERS)}>
      <StepHead>
        <StepTitle component="h1">{t("pickFolder.title")}</StepTitle>
        <StepBody component="p">{t("pickFolder.body")}</StepBody>
      </StepHead>
      <StepContent>
        <InputRow>
          <Input
            size="small"
            value={draft}
            placeholder={t("pickFolder.browse_placeholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addPath(draft);
              }
            }}
            slotProps={{
              htmlInput: { "data-testid": TEST_IDS.onboarding.pickFolderInput },
            }}
          />
          <GeneralButton
            variant="outline"
            onClick={() => void browse()}
            loading={busy}
            disabled={!isTauri()}
            startIcon={<FolderOpen size={14} />}
            data-testid={TEST_IDS.onboarding.pickFolderBrowse}
          >
            {t("pickFolder.browse")}
          </GeneralButton>
        </InputRow>

        {empty ? (
          <Empty component="p">{t("pickFolder.list_empty")}</Empty>
        ) : (
          <PathList>
            {scanPaths.map((p: string) => (
              <PathRow key={p}>
                <PathText component="span">{p}</PathText>
                <GeneralIconButton
                  icon={<Trash2 size={12} />}
                  size={IconButtonSize.XS}
                  variant="ghost"
                  aria-label={`Remove ${p}`}
                  onClick={() => void removePath(p)}
                  data-testid={TEST_IDS.onboarding.pickFolderRemove(p)}
                />
              </PathRow>
            ))}
          </PathList>
        )}
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          data-testid={TEST_IDS.onboarding.pickFolderBack}
        >
          {t("pickFolder.back")}
        </GeneralButton>
        {empty ? (
          <GeneralTooltip title={t("pickFolder.at_least_one")} arrow placement="top">
            <Box component="span">
              <GeneralButton disabled data-testid={TEST_IDS.onboarding.pickFolderNext}>
                {t("pickFolder.next")}
              </GeneralButton>
            </Box>
          </GeneralTooltip>
        ) : (
          <GeneralButton onClick={onNext} data-testid={TEST_IDS.onboarding.pickFolderNext}>
            {t("pickFolder.next")}
          </GeneralButton>
        )}
      </StepFooter>
    </StepRoot>
  );
}

export default PickFolderStep;
