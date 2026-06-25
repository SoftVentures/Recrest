import { useTranslation } from "react-i18next";

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
  /** Keeps the dialog open with a spinner on the confirm button while a slow
   *  confirm action (e.g. trashing a repo's folder) runs. Disables both
   *  buttons and blocks backdrop/ESC dismissal so the in-flight action can't
   *  be abandoned mid-way. */
  confirmLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  confirmLoading = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const { t } = useTranslation();
  return (
    <GeneralModal
      open={open}
      modalWidth={420}
      customTitle={title}
      subtitle={description}
      textCapitalize={false}
      onCloseModal={confirmLoading ? () => {} : onCancel}
      data-testid={TEST_IDS.confirmDialog.root}
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onCancel}
            disabled={confirmLoading}
            data-testid={TEST_IDS.confirmDialog.cancel}
          >
            {cancelLabel ?? t("actions.cancel")}
          </GeneralButton>
          <GeneralButton
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={confirmLoading}
            data-testid={TEST_IDS.confirmDialog.confirm}
          >
            {confirmLabel ?? t("actions.confirm")}
          </GeneralButton>
        </>
      }
    />
  );
}

export default ConfirmationModal;
