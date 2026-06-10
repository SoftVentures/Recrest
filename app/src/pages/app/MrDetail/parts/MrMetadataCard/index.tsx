import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import type { PullRequest } from "@recrest/shared";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import MrChip from "@/components/atoms/chips/MrChip";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { formatDateLong } from "@/lib/utils/dateFormat.utils";
import {
  MetaCell,
  MetaGrid,
  MetaLabel,
  MetaValue,
} from "@/pages/app/MrDetail/parts/MrMetadataCard/MrMetadataCard.styles";

interface Props {
  pr: PullRequest;
}

export default function MrMetadataCard({ pr }: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);

  return (
    <GeneralCard title={tPrs("detail.section_metadata")} flushHeight>
      <MetaGrid>
        <MetaCell>
          <MetaLabel>{tPrs("detail.meta_opened")}</MetaLabel>
          <MetaValue>{formatDateLong(pr.createdAt)}</MetaValue>
        </MetaCell>
        <MetaCell>
          <MetaLabel>{tPrs("detail.meta_updated")}</MetaLabel>
          <MetaValue>{formatDateLong(pr.updatedAt)}</MetaValue>
        </MetaCell>
        <MetaCell>
          <MetaLabel>{tPrs("detail.meta_author")}</MetaLabel>
          <MetaValue>
            <AuthorAvatar name={pr.author} avatarUrl={pr.authorAvatarUrl ?? null} size={18} />
            <Box component="span">{pr.author}</Box>
          </MetaValue>
        </MetaCell>
        <MetaCell>
          <MetaLabel>{tPrs("detail.meta_state")}</MetaLabel>
          <MetaValue>
            <MrChip state={pr.state} draft={pr.draft}>
              {tPrs(`state.${pr.draft ? "draft" : pr.state}`)}
            </MrChip>
          </MetaValue>
        </MetaCell>
      </MetaGrid>
    </GeneralCard>
  );
}
