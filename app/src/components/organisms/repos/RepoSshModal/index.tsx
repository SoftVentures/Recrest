import { useTranslation } from "react-i18next";

import GeneralModal from "@/components/molecules/modals/GeneralModal";
import RepoSshSettings from "@/components/organisms/repos/RepoSshSettings";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface RepoSshModalProps {
  open: boolean;
  onClose: () => void;
  repoId: string;
  sshKeyPath: string | null;
}

/** Houses the per-repo SSH override behind a modal so it stays out of the way
 *  on the detail page — most repos use the global/agent default. */
export function RepoSshModal({ open, onClose, repoId, sshKeyPath }: RepoSshModalProps) {
  const { t } = useTranslation();
  return (
    <GeneralModal
      open={open}
      modalWidth={520}
      customTitle={t("ssh.title")}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.repoDetail.ssh.modal}
      contentChildren={<RepoSshSettings repoId={repoId} sshKeyPath={sshKeyPath} />}
    />
  );
}

export default RepoSshModal;
