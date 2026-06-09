import { useTranslation } from "react-i18next";

import type { Comment } from "@recrest/shared";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import {
  PostedAuthor,
  PostedBody,
  PostedComment,
  PostedHead,
  RangeBadge,
} from "@/components/molecules/diff/DiffView/DiffView.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  comment: Comment;
  /** Highlight / clear the comment's covered lines while the card is hovered. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** A posted comment: author avatar + name on the header line, the covered line
 *  range as a badge (multi-line comments only), and the body below. */
export default function CommentItem({ comment, onMouseEnter, onMouseLeave }: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const isRange = comment.startLine != null && comment.line != null;
  return (
    <PostedComment
      data-testid={TEST_IDS.mr.diff.postedComment}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PostedHead>
        <AuthorAvatar
          name={comment.author}
          avatarUrl={comment.authorAvatarUrl ?? undefined}
          size={18}
        />
        <PostedAuthor component="span" variant="caption">
          {comment.author}
        </PostedAuthor>
        {isRange && (
          <RangeBadge component="span" data-testid={TEST_IDS.mr.diff.rangeBadge}>
            {t("diff.range_label", { start: comment.startLine, end: comment.line })}
          </RangeBadge>
        )}
      </PostedHead>
      <PostedBody component="span">{comment.body}</PostedBody>
    </PostedComment>
  );
}
