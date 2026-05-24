import { type ReactNode, memo } from "react";

import { Box, Dialog, DialogActions, DialogContent, type DialogProps, Fade } from "@mui/material";
import { styled } from "@mui/material/styles";

import ModalTitle from "@/components/molecules/modals/GeneralModal/ModalTitle";
import { openExternal } from "@/lib/tauri";

interface RootBoxProps {
  $modalWidth?: number | string;
  $modalHeight?: number | string;
  $modalMaxHeight?: number | string;
}

const Root = styled(Box, {
  shouldForwardProp: (p) =>
    !["$modalWidth", "$modalHeight", "$modalMaxHeight"].includes(p as string),
})<RootBoxProps>(({ $modalWidth, $modalHeight, $modalMaxHeight }) => ({
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 20,
  width: $modalWidth ?? 560,
  height: $modalHeight ?? "auto",
  maxHeight: $modalMaxHeight ?? "100%",
  minHeight: 0,
}));

interface StyledDialogProps {
  $transparentBackdrop: boolean;
}

const StyledDialog = styled(Dialog, {
  shouldForwardProp: (p) => p !== "$transparentBackdrop",
})<StyledDialogProps>(({ theme, $transparentBackdrop }) => ({
  "& .MuiBackdrop-root": $transparentBackdrop ? { backgroundColor: "transparent" } : undefined,
  "& .MuiDialog-paper": {
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    backgroundImage: "unset",
    color: theme.palette.text.primary,
    borderRadius: 8,
    margin: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
}));

const StyledContent = styled(DialogContent)({
  margin: 0,
  padding: 0,
  overflow: "auto",
  flex: 1,
  minHeight: 0,
});

const StyledActions = styled(DialogActions)({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
  padding: "16px 0 0 0",
  width: "100%",
});

export interface GeneralModalProps {
  open: boolean;
  /** Overall paper width — default 560px. Use `"100%"` for fluid layouts. */
  modalWidth?: number | string;
  /** Overall paper height — default `auto`. */
  modalHeight?: number | string;
  /** Overall paper max-height — default `100%`. */
  modalMaxHeight?: number | string;
  /** Title node rendered inside the canonical title bar (text or JSX). */
  customTitle?: ReactNode;
  /** Optional subtitle line under the title. */
  subtitle?: ReactNode;
  /** Body content slot. Renders inside a scrollable region. */
  contentChildren?: ReactNode;
  /** Action button row slot (right-aligned, gapped). */
  actionsChildren?: ReactNode;
  /** Close callback. The string arg is reserved for symmetry with the
   *  copy/open-in-new-tab flow; pass `""` from the default close icon. */
  onCloseModal?: (value: string) => void;
  /** If set, the title bar shows a copy icon that writes this value to clipboard. */
  onCopyValue?: string;
  /** If set, the title bar shows an "open in browser" icon for this URL. */
  onOpenInNewTab?: string;
  /** Hide the close icon in the title bar (still closable via Esc / backdrop unless `disableBackdropClick`). */
  closeIcon?: boolean;
  /** Capitalise the title text — default true. */
  textCapitalize?: boolean;
  /** Block both backdrop-click and Esc to dismiss. */
  disableBackdropClick?: boolean;
  /** Transparent backdrop — for overlay modals on top of other modals. */
  transparentBackdrop?: boolean;
  /** Enable fade-in transition — default true. */
  withTransition?: boolean;
  /** Forwarded as `data-testid` on the dialog root. */
  "data-testid"?: string;
  /** MUI `maxWidth` ceiling (one of `xs`/`sm`/`md`/`lg`/`xl` or false). Default `md`. */
  maxWidth?: DialogProps["maxWidth"];
}

const GeneralModal = ({
  open,
  modalWidth = 560,
  modalHeight,
  modalMaxHeight = "100%",
  customTitle,
  subtitle,
  contentChildren,
  actionsChildren,
  onCloseModal,
  onCopyValue,
  onOpenInNewTab,
  maxWidth = "md",
  closeIcon = true,
  textCapitalize = true,
  disableBackdropClick = false,
  transparentBackdrop = false,
  withTransition = true,
  "data-testid": testId,
}: GeneralModalProps) => {
  const handleClose = () => onCloseModal?.("");

  const handleCopy = onCopyValue
    ? () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(onCopyValue);
        }
      }
    : undefined;

  const handleOpenInNewTab = onOpenInNewTab
    ? () => {
        void openExternal(onOpenInNewTab);
      }
    : undefined;

  return (
    <StyledDialog
      aria-labelledby="general-modal-title"
      open={open}
      onClose={(_, reason) => {
        if (disableBackdropClick && (reason === "backdropClick" || reason === "escapeKeyDown")) {
          return;
        }
        handleClose();
      }}
      maxWidth={maxWidth}
      $transparentBackdrop={transparentBackdrop}
      data-testid={testId}
      slots={{ transition: Fade }}
      slotProps={{ transition: { timeout: withTransition ? 220 : 0 } }}
    >
      <Root $modalWidth={modalWidth} $modalHeight={modalHeight} $modalMaxHeight={modalMaxHeight}>
        {customTitle && (
          <ModalTitle
            id="general-modal-title"
            subtitle={subtitle}
            textCapitalize={textCapitalize}
            onClose={closeIcon ? handleClose : undefined}
            onCopy={handleCopy}
            onOpenInNewTab={handleOpenInNewTab}
          >
            {customTitle}
          </ModalTitle>
        )}

        {contentChildren && <StyledContent>{contentChildren}</StyledContent>}

        {actionsChildren && <StyledActions>{actionsChildren}</StyledActions>}
      </Root>
    </StyledDialog>
  );
};

export default memo(GeneralModal);
