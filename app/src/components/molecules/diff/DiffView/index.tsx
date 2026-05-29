import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  type Comment,
  type CommentPosition,
  CommentSide,
  FileChangeStatus,
  type FileDiff,
} from "@recrest/shared";

import { ChevronDown, ChevronRight, MessageSquarePlus } from "lucide-react";

import {
  CommentAffordance,
  CommentRow,
  Content,
  Empty,
  FileBlock,
  FileHeader,
  FilePath,
  Gutter,
  HunkHeader,
  Line,
  Lines,
  PostedAuthor,
  PostedComment,
  RenamedFrom,
  Root,
  Sign,
  StatusTag,
} from "@/components/molecules/diff/DiffView/DiffView.styles";
import InlineComposer from "@/components/molecules/diff/DiffView/parts/InlineComposer";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface DiffViewProps {
  files: FileDiff[];
  /** Comments to render inline, matched by `path` + new-side line number. */
  comments?: Comment[];
  /** When provided, each line gets a comment affordance. Omit for read-only. */
  onComment?: (path: string, position: CommentPosition, body: string) => Promise<void> | void;
}

const STATUS_TONE: Record<FileChangeStatus, "add" | "remove" | "neutral"> = {
  added: "add",
  removed: "remove",
  modified: "neutral",
  renamed: "neutral",
  copied: "neutral",
  changed: "neutral",
};

/** Stable identity for a clickable line: `<path>:<side>:<line>`. */
function lineKey(path: string, side: CommentSide, line: number): string {
  return `${path}:${side}:${line}`;
}

export default function DiffView({ files, comments, onComment }: DiffViewProps) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [composingAt, setComposingAt] = useState<string | null>(null);

  // Bucket comments by `path` so a file render only scans its own slice.
  const commentsByPath = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments ?? []) {
      if (!c.path) continue;
      const arr = map.get(c.path) ?? [];
      arr.push(c);
      map.set(c.path, arr);
    }
    return map;
  }, [comments]);

  if (files.length === 0) {
    return <Empty>{t("diff.empty")}</Empty>;
  }

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <Root>
      {files.map((file) => {
        const isCollapsed = collapsed.has(file.path);
        const fileComments = commentsByPath.get(file.path) ?? [];
        return (
          <FileBlock key={file.path} data-testid={TEST_IDS.mr.diff.file}>
            <FileHeader type="button" onClick={() => toggle(file.path)}>
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <FilePath>{file.path}</FilePath>
              {file.status === FileChangeStatus.RENAMED && file.oldPath && (
                <RenamedFrom component="span" variant="caption">
                  {t("diff.renamed_from", { path: file.oldPath })}
                </RenamedFrom>
              )}
              <StatusTag tone={STATUS_TONE[file.status]}>{file.status}</StatusTag>
            </FileHeader>

            {!isCollapsed &&
              (file.hunks.length === 0 ? (
                <Empty>{t("diff.binary")}</Empty>
              ) : (
                file.hunks.map((hunk, hi) => (
                  <Box key={`${file.path}-h${hi}`}>
                    <HunkHeader>
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </HunkHeader>
                    <Lines>
                      {hunk.lines.map((line, li) => {
                        // Anchor inline comments on the post-change side when a
                        // new line exists, else the removed (old) side.
                        const side = line.newLineNo != null ? CommentSide.RIGHT : CommentSide.LEFT;
                        const anchorLine = line.newLineNo ?? line.oldLineNo ?? 0;
                        const key = lineKey(file.path, side, anchorLine);
                        const canComment = onComment != null && anchorLine > 0;
                        return (
                          <Line
                            key={`${file.path}-h${hi}-l${li}`}
                            kind={line.kind}
                            data-testid={TEST_IDS.mr.diff.line}
                          >
                            <Gutter>{line.oldLineNo ?? ""}</Gutter>
                            <Gutter>{line.newLineNo ?? ""}</Gutter>
                            <Content>
                              <Sign>
                                {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
                              </Sign>
                              <Box component="span">{line.content}</Box>
                            </Content>
                            {canComment && (
                              <CommentAffordance
                                type="button"
                                className="diff-comment-affordance"
                                aria-label={t("diff.add_comment")}
                                title={t("diff.add_comment")}
                                data-testid={TEST_IDS.mr.diff.commentBtn}
                                onClick={() => setComposingAt(key)}
                              >
                                <MessageSquarePlus size={11} aria-hidden />
                              </CommentAffordance>
                            )}

                            {composingAt === key && onComment && (
                              <CommentRow>
                                <InlineComposer
                                  onSubmit={async (body) => {
                                    await onComment(
                                      file.path,
                                      { side, line: anchorLine, startLine: null },
                                      body,
                                    );
                                    setComposingAt(null);
                                  }}
                                  onCancel={() => setComposingAt(null)}
                                />
                              </CommentRow>
                            )}
                          </Line>
                        );
                      })}
                    </Lines>
                  </Box>
                ))
              ))}

            {!isCollapsed &&
              fileComments.map((c) => (
                <PostedComment key={c.id}>
                  <PostedAuthor component="span" variant="caption">
                    {c.author}
                  </PostedAuthor>
                  <Box component="span">{c.body}</Box>
                </PostedComment>
              ))}
          </FileBlock>
        );
      })}
    </Root>
  );
}
