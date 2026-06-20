import { type BranchInfo, TauriCommand } from "@recrest/shared";

import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";

export interface DeleteBranchDialogProps {
  open: boolean;
  repoId: string;
  branch: BranchInfo;
  onClose: () => void;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function DeleteBranchDialog({
  open,
  repoId,
  branch,
  onClose,
  run,
  t,
}: DeleteBranchDialogProps) {
  // A local branch carries commits at risk of being lost if it has no upstream
  // to fall back on, or sits ahead of the one it tracks. git2 deletes
  // unconditionally (libgit2 skips the CLI's merge check), so the dialog copy
  // is the only safety net here.
  const unmerged = !branch.upstream || branch.ahead > 0;

  const onConfirm = () => {
    void run(
      `${repoId}:${branch.name}:delete`,
      TauriCommand.GIT_BRANCH_DELETE,
      { repoId, branch: branch.name },
      t("branches.actions.deleted", { branch: branch.name }),
    );
    onClose();
  };

  return (
    <ConfirmationModal
      open={open}
      destructive
      title={t("branches.delete.title")}
      description={t(unmerged ? "branches.delete.body_unmerged" : "branches.delete.body", {
        branch: branch.name,
      })}
      confirmLabel={t("branches.delete.confirm")}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}

export default DeleteBranchDialog;
