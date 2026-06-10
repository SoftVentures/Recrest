import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Check, Copy, ShieldAlert } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { Platform, usePlatform } from "@/hooks/usePlatform";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";

const KEYGEN_CMD = 'ssh-keygen -t ed25519 -C "you@example.com"';

/** Command to print the public key, per OS shell convention. */
function printPubCmd(platform: Platform): string {
  return platform === Platform.WINDOWS
    ? "type %USERPROFILE%\\.ssh\\id_ed25519.pub"
    : "cat ~/.ssh/id_ed25519.pub";
}

const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 14,
}) as typeof Box;

const Step = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

const StepTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

const StepText = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.information,
  lineHeight: 1.5,
})) as typeof Typography;

const CmdRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Box;

const Cmd = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflowX: "auto",
  fontFamily: MONO_STACK,
  fontSize: 12,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
})) as typeof Box;

const SecurityNote = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.warning.main}`,
  backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 10%, transparent)`,
  color: theme.palette.text.primary,
  fontSize: 12,
  lineHeight: 1.5,
})) as typeof Box;

const SecurityIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  flexShrink: 0,
  marginTop: 1,
  color: theme.palette.warning.main,
})) as typeof Box;

export interface SshKeyGuideModalProps {
  open: boolean;
  onClose: () => void;
}

function CopyableCommand({ value, testId }: { value: string; testId?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <CmdRow>
      <Cmd component="code">{value}</Cmd>
      <GeneralButton
        variant="ghost"
        size="sm"
        startIcon={copied ? <Check size={13} /> : <Copy size={13} />}
        onClick={() => void copy()}
        data-testid={testId}
      >
        {copied ? t("ssh.guide.copied") : t("ssh.guide.copy")}
      </GeneralButton>
    </CmdRow>
  );
}

export function SshKeyGuideModal({ open, onClose }: SshKeyGuideModalProps) {
  const { t } = useTranslation();
  const platform = usePlatform();

  return (
    <GeneralModal
      open={open}
      modalWidth={520}
      customTitle={t("ssh.guide.title")}
      subtitle={t("ssh.guide.subtitle")}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.ssh.guideModal}
      contentChildren={
        <Body>
          <Step>
            <StepTitle component="h4">{t("ssh.guide.step1_title")}</StepTitle>
            <StepText component="p" variant="body2">
              {t("ssh.guide.step1_text")}
            </StepText>
            <CopyableCommand value={KEYGEN_CMD} testId={TEST_IDS.ssh.guideCopy} />
          </Step>

          <Step>
            <StepTitle component="h4">{t("ssh.guide.step2_title")}</StepTitle>
            <StepText component="p" variant="body2">
              {t("ssh.guide.step2_text")}
            </StepText>
            <CopyableCommand value={printPubCmd(platform)} />
          </Step>

          <Step>
            <StepTitle component="h4">{t("ssh.guide.step3_title")}</StepTitle>
            <StepText component="p" variant="body2">
              {t("ssh.guide.step3_text")}
            </StepText>
          </Step>

          <SecurityNote>
            <SecurityIcon>
              <ShieldAlert size={15} />
            </SecurityIcon>
            <Box component="span">{t("ssh.guide.security")}</Box>
          </SecurityNote>
        </Body>
      }
      actionsChildren={
        <GeneralButton variant="default" onClick={onClose}>
          {t("ssh.guide.done")}
        </GeneralButton>
      }
    />
  );
}

export default SshKeyGuideModal;
