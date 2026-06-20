import { useTranslation } from "react-i18next";

import { styled } from "@mui/material/styles";

import { PROVIDER_NAMES, type ProviderId } from "@recrest/shared";

import { ExternalLink, LogIn } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Keep every action on a single line: with three buttons the labels would
// otherwise shrink and wrap to two lines. `flexShrink: 0` holds their width
// and `nowrap` keeps the text intact; the modal is sized to fit all three.
const ActionButton = styled(GeneralButton)({
  flexShrink: 0,
  whiteSpace: "nowrap",
});

export interface ConnectProviderPromptModalProps {
  open: boolean;
  providerId: ProviderId;
  onConnect: () => void;
  onProceed: () => void;
  onClose: () => void;
}

function ConnectProviderPromptModal({
  open,
  providerId,
  onConnect,
  onProceed,
  onClose,
}: ConnectProviderPromptModalProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const provider = PROVIDER_NAMES[providerId];

  return (
    <GeneralModal
      open={open}
      modalWidth={560}
      customTitle={t("connect_prompt.title", { provider })}
      subtitle={t("connect_prompt.body", { provider })}
      textCapitalize={false}
      onCloseModal={onClose}
      data-testid={TEST_IDS.connectPrompt.root}
      actionsChildren={
        <>
          <ActionButton
            variant="ghost"
            onClick={onClose}
            data-testid={TEST_IDS.connectPrompt.cancel}
          >
            {t("connect_prompt.cancel")}
          </ActionButton>
          <ActionButton
            variant="outline"
            startIcon={<ExternalLink size={15} />}
            onClick={onProceed}
            data-testid={TEST_IDS.connectPrompt.proceed}
          >
            {t("connect_prompt.proceed", { provider })}
          </ActionButton>
          <ActionButton
            variant="default"
            startIcon={<LogIn size={15} />}
            onClick={onConnect}
            data-testid={TEST_IDS.connectPrompt.connect}
          >
            {t("connect_prompt.connect", { provider })}
          </ActionButton>
        </>
      }
    />
  );
}

export default ConnectProviderPromptModal;
