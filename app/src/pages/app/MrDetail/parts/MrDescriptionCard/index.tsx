import { useTranslation } from "react-i18next";

import { Pencil } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import ExpandableContent from "@/components/atoms/layout/ExpandableContent";
import MarkdownView from "@/components/atoms/text/MarkdownView";
import RichTextEditor from "@/components/atoms/text/RichTextEditor";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { Empty } from "@/pages/app/MrDetail/MrDetail.styles";
import {
  Editor,
  EditorActions,
} from "@/pages/app/MrDetail/parts/MrDescriptionCard/MrDescriptionCard.styles";
import { pxToRem } from "@/theme/scale";

interface Props {
  effectiveDescription: string;
  detailLoading: boolean;
  hasDetail: boolean;
  editing: boolean;
  draft: string;
  onBeginEdit: () => void;
  onDraftChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function MrDescriptionCard({
  effectiveDescription,
  detailLoading,
  hasDetail,
  editing,
  draft,
  onBeginEdit,
  onDraftChange,
  onSave,
  onCancel,
}: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);

  return (
    <GeneralCard
      title={tPrs("detail.section_description")}
      right={
        !editing && (
          <GeneralIconButton
            size={IconButtonSize.SM}
            aria-label={tPrs("detail.edit_description")}
            onClick={onBeginEdit}
            icon={<Pencil size={pxToRem(12)} />}
            data-testid={TEST_IDS.mr.editDescription}
          />
        )
      }
      flushHeight
    >
      {editing ? (
        <Editor>
          <RichTextEditor
            value={draft}
            onChange={onDraftChange}
            placeholder={tPrs("detail.description_placeholder")}
            data-testid={TEST_IDS.mr.descriptionInput}
          />
          <EditorActions>
            <GeneralButton
              variant="ghost"
              onClick={onCancel}
              data-testid={TEST_IDS.mr.descriptionCancel}
            >
              {tPrs("detail.cancel")}
            </GeneralButton>
            <GeneralButton
              variant="default"
              onClick={onSave}
              data-testid={TEST_IDS.mr.descriptionSave}
            >
              {tPrs("detail.save")}
            </GeneralButton>
          </EditorActions>
        </Editor>
      ) : effectiveDescription.trim() ? (
        <ExpandableContent
          collapsedHeight={220}
          showMoreLabel={tPrs("detail.show_more")}
          showLessLabel={tPrs("detail.show_less")}
          toggleTestId={TEST_IDS.mr.descriptionToggle}
        >
          <MarkdownView source={effectiveDescription} />
        </ExpandableContent>
      ) : detailLoading && !hasDetail ? (
        <Empty>{tPrs("diff.loading")}</Empty>
      ) : (
        <Empty>{tPrs("detail.no_description")}</Empty>
      )}
    </GeneralCard>
  );
}
