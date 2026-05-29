import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import type { Reviewer } from "@recrest/shared";

import { Plus } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  ReviewerChip,
  ReviewerChips,
  ReviewerState,
} from "@/pages/app/MergeRequests/components/MrDetailPanel/MrDetailPanel.styles";
import { Empty } from "@/pages/app/MrDetail/MrDetail.styles";
import {
  ReviewerForm,
  TextInput,
} from "@/pages/app/MrDetail/parts/MrReviewersCard/MrReviewersCard.styles";

interface Props {
  reviewers: Reviewer[];
  adding: boolean;
  draft: string;
  onBeginAdd: () => void;
  onDraftChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function MrReviewersCard({
  reviewers,
  adding,
  draft,
  onBeginAdd,
  onDraftChange,
  onSubmit,
  onCancel,
}: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);

  return (
    <GeneralCard
      title={tPrs("detail.section_reviewers")}
      sub={`${reviewers.length}`}
      right={
        !adding && (
          <GeneralIconButton
            size={IconButtonSize.SM}
            aria-label={tPrs("detail.add_reviewer")}
            onClick={onBeginAdd}
            icon={<Plus size={12} />}
            data-testid={TEST_IDS.mr.addReviewer}
          />
        )
      }
      flushHeight
    >
      {reviewers.length === 0 && !adding ? (
        <Empty>{tPrs("detail.no_reviewers")}</Empty>
      ) : (
        <ReviewerChips>
          {reviewers.map((r) => (
            <ReviewerChip component="span" key={r.login} data-state={r.state}>
              <AuthorAvatar name={r.name ?? r.login} avatarUrl={r.avatarUrl ?? null} size={14} />
              <Box component="span">{r.name ?? r.login}</Box>
              <ReviewerState component="span" variant="caption">
                {r.state.replace("_", " ")}
              </ReviewerState>
            </ReviewerChip>
          ))}
        </ReviewerChips>
      )}
      {adding && (
        <ReviewerForm>
          <TextInput
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={tPrs("detail.reviewer_input_placeholder")}
            autoFocus
            data-testid={TEST_IDS.mr.reviewerInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
          />
          <GeneralButton
            variant="default"
            onClick={onSubmit}
            disabled={!draft.trim()}
            data-testid={TEST_IDS.mr.reviewerSubmit}
          >
            {tPrs("detail.add")}
          </GeneralButton>
          <GeneralButton variant="ghost" onClick={onCancel}>
            {tPrs("detail.cancel")}
          </GeneralButton>
        </ReviewerForm>
      )}
    </GeneralCard>
  );
}
