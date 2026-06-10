import { useTranslation } from "react-i18next";

import type { Comment, CommentPosition, FileDiff } from "@recrest/shared";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import DiffView from "@/components/molecules/diff/DiffView";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { Empty } from "@/pages/app/MrDetail/MrDetail.styles";

interface Props {
  diff: FileDiff[] | undefined;
  diffLoading: boolean;
  comments: Comment[] | undefined;
  onComment: (path: string, position: CommentPosition, body: string) => Promise<void>;
}

export default function MrDiffCard({ diff, diffLoading, comments, onComment }: Props) {
  const { t: tPrs } = useTranslation(I18nNamespace.PRS);
  const count = diff?.length ?? 0;
  return (
    <GeneralCard
      title={tPrs("detail.section_diff")}
      sub={tPrs("detail.files", { count })}
      flushHeight
    >
      {diffLoading && !diff ? (
        <Empty>{tPrs("diff.loading")}</Empty>
      ) : !diff || diff.length === 0 ? (
        <Empty>{tPrs("diff.empty")}</Empty>
      ) : (
        <DiffView files={diff} comments={comments} onComment={onComment} />
      )}
    </GeneralCard>
  );
}
