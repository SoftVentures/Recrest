import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { ArrowLeft } from "lucide-react";

import GeneralLoader from "@/components/atoms/loaders/GeneralLoader";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { BackBar, BackButton, LoadingRoot, Root } from "@/pages/app/MrDetail/MrDetail.styles";
import { pxToRem } from "@/theme/scale";

interface Props {
  onBack: () => void;
}

/** Shown while the detail fetch this route owns is still in flight, so a deep
 *  link or a hard refresh doesn't flash "not found" before the data lands. */
export default function MrDetailLoading({ onBack }: Props) {
  const { t: tCommon } = useTranslation(I18nNamespace.COMMON);
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
          <ArrowLeft size={pxToRem(13)} />
          <Box component="span">{tPrs("detail.back")}</Box>
        </BackButton>
      </BackBar>
      <LoadingRoot>
        <GeneralLoader label={tCommon("states.loading")} data-testid={TEST_IDS.mr.detailLoading} />
      </LoadingRoot>
    </Root>
  );
}
