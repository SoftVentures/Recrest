import type { ReactNode } from "react";

import { Box, DialogTitle, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { X as CloseIcon, Copy as CopyIcon, ExternalLink } from "lucide-react";

import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";

/** Title slot for `GeneralModal` — the row with title/subtitle on the left and
 *  optional copy / open-in-browser / close icon-buttons on the right. */
export interface ModalTitleProps {
  children: ReactNode;
  subtitle?: ReactNode;
  /** Capitalise the title text (matches Nexyfi parity, default true). */
  textCapitalize?: boolean;
  onClose?: () => void;
  onCopy?: () => void;
  onOpenInNewTab?: () => void;
  id?: string;
}

const StyledTitle = styled(DialogTitle)({
  display: "flex",
  flexDirection: "column",
  position: "relative",
  padding: "0 0 14px",
}) as typeof DialogTitle;

const TitleRow = styled(Box)({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
}) as typeof Box;

const TitleActions = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginLeft: "auto",
  flexShrink: 0,
}) as typeof Box;

interface TitleTextProps {
  capitalize: boolean;
}

const TitleText = styled(Typography, {
  shouldForwardProp: (p) => p !== "capitalize",
})<TitleTextProps>(({ theme, capitalize }) => ({
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: "24px",
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  textTransform: capitalize ? "capitalize" : "none",
  display: "flex",
  alignItems: "center",
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  marginTop: 4,
  fontSize: 12.5,
  color: theme.palette.text.information,
  lineHeight: "18px",
})) as typeof Typography;

function ModalTitle({
  children,
  subtitle,
  textCapitalize = true,
  onClose,
  onCopy,
  onOpenInNewTab,
  id,
}: ModalTitleProps) {
  return (
    <StyledTitle id={id}>
      <TitleRow>
        <TitleText capitalize={textCapitalize}>{children}</TitleText>
        <TitleActions>
          {onCopy && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label="Copy"
              onClick={onCopy}
              icon={<CopyIcon size={13} />}
            />
          )}
          {onOpenInNewTab && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label="Open in browser"
              onClick={onOpenInNewTab}
              icon={<ExternalLink size={13} />}
            />
          )}
          {onClose && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label="Close"
              onClick={onClose}
              icon={<CloseIcon size={14} />}
            />
          )}
        </TitleActions>
      </TitleRow>
      {subtitle && <Subtitle component="span">{subtitle}</Subtitle>}
    </StyledTitle>
  );
}

export default ModalTitle;
