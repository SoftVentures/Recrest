import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <GeneralModal
      open={open}
      modalWidth={420}
      customTitle={title}
      subtitle={description}
      textCapitalize={false}
      onCloseModal={onCancel}
      data-testid={TEST_IDS.confirmDialog.root}
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onCancel}
            data-testid={TEST_IDS.confirmDialog.cancel}
          >
            {cancelLabel}
          </GeneralButton>
          <GeneralButton
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            data-testid={TEST_IDS.confirmDialog.confirm}
          >
            {confirmLabel}
          </GeneralButton>
        </>
      }
    />
  );
}

export default ConfirmationModal;
