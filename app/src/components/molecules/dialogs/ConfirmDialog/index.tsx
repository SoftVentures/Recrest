import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} data-testid="confirm-dialog">
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <GeneralButton variant="ghost" onClick={onCancel} data-testid="confirm-dialog-cancel">
          {cancelLabel}
        </GeneralButton>
        <GeneralButton
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
          data-testid="confirm-dialog-confirm"
        >
          {confirmLabel}
        </GeneralButton>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;
