import { type ReactNode, memo } from "react";

import { Box, Dialog, DialogActions, DialogContent, type DialogProps, Fade } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";

import ModalTitle from "@/components/molecules/modals/GeneralModal/ModalTitle";
import { openExternal } from "@/lib/tauri";
import { frostedPanel } from "@/lib/utils/translucency.utils";
import { pxToRem, pxToRems } from "@/theme/scale";

/** Numeric modal dimensions are design pixels and have to ride the interface
 *  scale; string values (`"auto"`, `"100%"`, …) pass through untouched. */
function modalLength(value: number | string | undefined, fallback: string): string {
  if (typeof value === "number") return pxToRem(value);
  return value ?? fallback;
}

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
  padding: pxToRem(20),
  // `modalWidth`/`modalHeight` are the *outer* box including this padding, so a
  // caller asking for 1200 gets a 1200-design-px paper — not 1240.
  boxSizing: "border-box",
  width: modalLength($modalWidth, pxToRem(560)),
  height: modalLength($modalHeight, "auto"),
  // A numeric `modalWidth` is a *design* pixel value and therefore rides
  // `--ui-scale`: AddRepoModal's 1200 renders 1800 real px at scale 1.5, which
  // no longer fits a 1440-px window. Viewport units are the right ceiling
  // precisely because they ignore the scale — they describe the window, not the
  // design grid. `vw`/`vh`, not `%`: the Dialog paper is centred by flexbox and
  // therefore has an indefinite height, against which a percentage `maxHeight`
  // computes to `none` and is a silent no-op.
  maxWidth: "calc(100vw - 40px)",
  maxHeight: modalLength($modalMaxHeight, "calc(100vh - 40px)"),
  minHeight: 0,
}));

interface StyledDialogProps {
  $transparentBackdrop: boolean;
}

const StyledDialog = styled(Dialog, {
  shouldForwardProp: (p) => p !== "$transparentBackdrop",
})<StyledDialogProps>(({ theme, $transparentBackdrop }) => {
  return {
    // The backdrop frosts the whole app behind the modal rather than dropping a
    // flat static scrim — a lighter dim plus a blur reads as glass and matches
    // the modal's own frosting. (`$transparentBackdrop` modals stack on top of
    // another modal, so they stay clear.)
    "& .MuiBackdrop-root": $transparentBackdrop
      ? { backgroundColor: "transparent" }
      : {
          backgroundColor: alpha(theme.palette.common.black, 0.4),
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        },
    "& .MuiDialog-paper": {
      // Frosted-glass surface in translucency mode, solid canvas otherwise.
      ...frostedPanel(theme),
      border: `1px solid ${theme.palette.divider}`,
      backgroundImage: "unset",
      color: theme.palette.text.primary,
      borderRadius: 8,
      margin: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      // MUI's default `maxWidth="md"` would shrink the paper to ~768px while the
      // inner Root keeps its requested `modalWidth` (e.g. 1200) — the overflow
      // clips action buttons on the right edge. The paper therefore follows the
      // inner content, but never past the viewport minus a 16px gutter per side
      // (MUI's own `calc(100% - 64px)` height ceiling is loosened to match, so
      // Root's `calc(100vh - 40px)` stays the single effective height limit).
      maxWidth: "calc(100% - 32px) !important",
      maxHeight: "calc(100% - 32px)",
    },
  };
});

const StyledContent = styled(DialogContent)({
  margin: 0,
  padding: 0,
  // Vertical scroller instead of a hard clip: once Root hits its viewport
  // ceiling, tall bodies must stay reachable. Panels that manage their own
  // scrolling keep `flex: 1; min-height: 0`, so this axis never overflows for
  // them and `auto` stays invisible — no double scrollbars.
  overflow: "hidden auto",
  flex: 1,
  minHeight: 0,
  // Flex column so children with `flex: 1` (e.g. the AddRepo Body wrapping
  // ProvidersPanel / LocalPanel) actually fill the available height instead
  // of collapsing to intrinsic content height — that was leaving the modal
  // half-empty in the LocalPanel tab.
  display: "flex",
  flexDirection: "column",
});

const StyledActions = styled(DialogActions)({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: pxToRem(8),
  padding: pxToRems(16, 0, 0, 0),
  width: "100%",
});

export interface GeneralModalProps {
  open: boolean;
  /** Overall paper width in design px — default 560, always capped at the
   *  viewport. Use `"100%"` for fluid layouts. */
  modalWidth?: number | string;
  /** Overall paper height in design px — default `auto`. */
  modalHeight?: number | string;
  /** Overall paper max-height — default `calc(100vh - 40px)`. Percentages are a
   *  no-op (indefinite parent height). */
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
  modalMaxHeight,
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
