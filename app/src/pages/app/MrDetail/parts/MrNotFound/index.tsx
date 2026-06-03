import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { ArrowLeft } from "lucide-react";

import EmptyState from "@/components/molecules/feedback/EmptyState";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { BackBar, BackButton, NotFoundRoot, Root } from "@/pages/app/MrDetail/MrDetail.styles";

interface Props {
  prNumber: number | null;
  onBack: () => void;
}

export default function MrNotFound({ prNumber, onBack }: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);

  return (
    <Root data-testid={TEST_IDS.mr.detailPage}>
      <BackBar>
        <BackButton
          type="button"
          onClick={onBack}
          data-testid={TEST_IDS.mr.backToList}
          aria-label={tAria("actions.go_back", { ns: I18nNamespace.COMMON })}
        >
          <ArrowLeft size={13} />
          <Box component="span">{tPrs("detail.back")}</Box>
        </BackButton>
      </BackBar>
      <NotFoundRoot>
        <EmptyState
          mascot="shrugging"
          title={tPrs("detail.not_found_title")}
          description={tPrs("detail.not_found_desc", { n: prNumber ?? "?" })}
        />
      </NotFoundRoot>
    </Root>
  );
}
