import { type MouseEvent, memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  type Comment,
  type CommentLineRef,
  type CommentSide,
  type DiffLine,
} from "@recrest/shared";

import { MessageSquarePlus } from "lucide-react";

import {
  CommentAffordance,
  CommentRow,
  Content,
  Gutter,
  Line,
  Sign,
} from "@/components/molecules/diff/DiffView/DiffView.styles";
import CommentItem from "@/components/molecules/diff/DiffView/parts/CommentItem";
import InlineComposer from "@/components/molecules/diff/DiffView/parts/InlineComposer";
import { DIFF_ATTR } from "@/lib/constants/diff.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

/** One end of a selection: the line's own side, its resolved line numbers, and
 *  its render-order index (`seq`) — so a cross-side range is ordered by diff
 *  position rather than line number. */
export interface SelectionEnd {
  side: CommentSide;
  ref: CommentLineRef;
  seq: number;
}

interface Props {
  path: string;
  line: DiffLine;
  /** Both line numbers resolved (the absent side filled from the hunk). */
  lineRef: CommentLineRef;
  side: CommentSide;
  seq: number;
  canComment: boolean;
  selected: boolean;
  selTop: boolean;
  selBottom: boolean;
  isComposerLine: boolean;
  anchored: Comment[];
  onStartDrag: (e: MouseEvent, path: string, end: SelectionEnd) => void;
  onSubmit: (body: string) => Promise<void> | void;
  onCancel: () => void;
  onCommentHover: (id: string) => void;
  onCommentLeave: () => void;
}

/**
 * A single diff line. Memoised: the parent re-renders on every selection /
 * composer-open change, but with stable props only the one affected row
 * actually re-renders — so opening or cancelling the composer stays O(1)
 * instead of reconciling the whole (possibly huge) diff.
 */
function DiffRow({
  path,
  line,
  lineRef,
  side,
  seq,
  canComment,
  selected,
  selTop,
  selBottom,
  isComposerLine,
  anchored,
  onStartDrag,
  onSubmit,
  onCancel,
  onCommentHover,
  onCommentLeave,
}: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  return (
    <Line
      kind={line.kind}
      selected={selected}
      selTop={selTop}
      selBottom={selBottom}
      data-testid={TEST_IDS.mr.diff.line}
      {...{
        [DIFF_ATTR.path]: path,
        [DIFF_ATTR.side]: side,
        [DIFF_ATTR.oldLine]: lineRef.oldLineNo ?? "",
        [DIFF_ATTR.newLine]: lineRef.newLineNo ?? "",
        [DIFF_ATTR.seq]: seq,
      }}
    >
      <Gutter>{line.oldLineNo ?? ""}</Gutter>
      <Gutter>{line.newLineNo ?? ""}</Gutter>
      <Content>
        <Sign>{line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}</Sign>
        <Box component="span">{line.content}</Box>
      </Content>
      {canComment && (
        <CommentAffordance
          type="button"
          className="diff-comment-affordance"
          aria-label={t("diff.add_comment")}
          title={t("diff.comment_hint")}
          data-testid={TEST_IDS.mr.diff.commentBtn}
          onMouseDown={(e) => onStartDrag(e, path, { side, ref: lineRef, seq })}
        >
          <MessageSquarePlus size={11} aria-hidden />
        </CommentAffordance>
      )}

      {anchored.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          onMouseEnter={() => onCommentHover(c.id)}
          onMouseLeave={onCommentLeave}
        />
      ))}

      {isComposerLine && (
        <CommentRow>
          <InlineComposer onSubmit={onSubmit} onCancel={onCancel} />
        </CommentRow>
      )}
    </Line>
  );
}

export default memo(DiffRow);
