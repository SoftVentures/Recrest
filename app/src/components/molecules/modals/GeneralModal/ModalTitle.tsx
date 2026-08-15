import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { Box, DialogTitle, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { X as CloseIcon, Copy as CopyIcon, ExternalLink } from "lucide-react";

import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

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
  padding: pxToRems(0, 0, 14),
}) as typeof DialogTitle;

const TitleRow = styled(Box)({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: pxToRem(12),
}) as typeof Box;

const TitleActions = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  marginLeft: "auto",
  flexShrink: 0,
}) as typeof Box;

interface TitleTextProps {
  capitalize: boolean;
}

// Box (renders a <div>), not Typography: the heading semantics come from the
// surrounding DialogTitle (<h2>), and the title is a flex container that may
// hold block children (badges, icons, status pills). A <p> here would nest
// <div>/<p> inside <p> and trip React's DOM nesting validator.
const TitleText = styled(Box, {
  shouldForwardProp: (p) => p !== "capitalize",
})<TitleTextProps>(({ theme, capitalize }) => ({
  margin: 0,
  fontSize: fontPxToRem(18),
  fontWeight: 700,
  lineHeight: 24 / 18,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  textTransform: capitalize ? "capitalize" : "none",
  display: "flex",
  alignItems: "center",
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.information,
  lineHeight: 18 / 12.5,
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
  const { t } = useTranslation(I18nNamespace.ARIA);
  return (
    <StyledTitle id={id}>
      <TitleRow>
        <TitleText capitalize={textCapitalize}>{children}</TitleText>
        <TitleActions>
          {onCopy && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={t("modal.copy")}
              onClick={onCopy}
              icon={<CopyIcon size={pxToRem(13)} />}
            />
          )}
          {onOpenInNewTab && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={t("modal.open_in_browser")}
              onClick={onOpenInNewTab}
              icon={<ExternalLink size={pxToRem(13)} />}
            />
          )}
          {onClose && (
            <GeneralIconButton
              size={IconButtonSize.SM}
              aria-label={t("modal.close")}
              onClick={onClose}
              icon={<CloseIcon size={pxToRem(14)} />}
            />
          )}
        </TitleActions>
      </TitleRow>
      {subtitle && <Subtitle component="span">{subtitle}</Subtitle>}
    </StyledTitle>
  );
}

export default ModalTitle;
