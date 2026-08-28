import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  type Comment,
  type CommentAnchor,
  type CommentLineRef,
  type CommentPosition,
  CommentSide,
  type DiffHunk,
  FileChangeStatus,
  type FileDiff,
} from "@recrest/shared";

import { ChevronDown, ChevronRight } from "lucide-react";

import {
  Empty,
  FileBlock,
  FileHeader,
  FilePath,
  HunkHeader,
  Lines,
  RenamedFrom,
  Root,
  StatusTag,
} from "@/components/molecules/diff/DiffView/DiffView.styles";
import CommentItem from "@/components/molecules/diff/DiffView/parts/CommentItem";
import DiffRow, { type SelectionEnd } from "@/components/molecules/diff/DiffView/parts/DiffRow";
import { DIFF_ATTR } from "@/lib/constants/diff.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { pxToRem } from "@/theme/scale";

export interface DiffViewProps {
  files: FileDiff[];
  /** Comments to render inline, matched by `path` + side + line number. */
  comments?: Comment[];
  /** When provided, each line gets a comment affordance. Omit for read-only. */
  onComment?: (path: string, position: CommentPosition, body: string) => Promise<void> | void;
}

/** Stable empty array so a comment-less row's `anchored` prop keeps identity
 *  across renders and `DiffRow`'s memo can skip it. */
const NO_COMMENTS: Comment[] = [];

// A single file over `MAX_FILE_LINES`, or any file once the cumulative rendered
// lines cross `MAX_TOTAL_LINES`, starts collapsed. Without this a large PR mounts
// tens of thousands of <DiffRow>s (each subscribing to i18n) on one synchronous
// render, freezing the page and leaving the whole app janky. Collapsed files
// render just their header until expanded — matching GitHub/GitLab's "large diffs
// are not rendered by default".
const MAX_FILE_LINES = 300;
const MAX_TOTAL_LINES = 1000;

function lineCountOf(file: FileDiff): number {
  let n = 0;
  for (const hunk of file.hunks) n += hunk.lines.length;
  return n;
}

const STATUS_TONE: Record<FileChangeStatus, "add" | "remove" | "neutral"> = {
  added: "add",
  removed: "remove",
  modified: "neutral",
  renamed: "neutral",
  copied: "neutral",
  changed: "neutral",
};

/** A line's anchor side: post-change when it has a new-side number, else the
 *  removed (old) side. Matches GitHub/GitLab's per-line anchoring. */
function lineSide(newLineNo: number | null): CommentSide {
  return newLineNo != null ? CommentSide.RIGHT : CommentSide.LEFT;
}

/** The line number on a given side (0 when the ref has none on that side). */
function sideNo(ref: CommentLineRef, side: CommentSide): number {
  return (side === CommentSide.RIGHT ? ref.newLineNo : ref.oldLineNo) ?? 0;
}

/**
 * Resolve, for every line in a hunk, BOTH the old and new line numbers — even
 * for pure add/remove lines, where the absent side gets the running counterpart
 * from the hunk's line counters. GitLab's `line_code` needs both numbers on
 * each range boundary, so we carry the full pair from here.
 */
function resolveHunkRefs(hunk: DiffHunk): CommentLineRef[] {
  let oldPos = hunk.oldStart;
  let newPos = hunk.newStart;
  return hunk.lines.map((line) => {
    const ref: CommentLineRef = {
      oldLineNo: line.oldLineNo ?? (line.kind === "add" ? oldPos : null),
      newLineNo: line.newLineNo ?? (line.kind === "remove" ? newPos : null),
    };
    if (line.kind !== "add") oldPos = (line.oldLineNo ?? oldPos) + 1;
    if (line.kind !== "remove") newPos = (line.newLineNo ?? newPos) + 1;
    return ref;
  });
}

interface Selection {
  path: string;
  anchor: SelectionEnd;
  head: SelectionEnd;
}

/** Per-line render data, resolved once per `files` change. */
interface RowMeta {
  ref: CommentLineRef;
  side: CommentSide;
  num: number;
  seq: number;
}

/** Key an anchored comment by `path`, side, and line number on that side. */
function anchorKey(path: string, side: CommentSide, line: number): string {
  return `${path} ${side} ${line}`;
}

/** Key a line by file + hunk + line index — stable across renders. */
function rowKey(path: string, hi: number, li: number): string {
  return `${path}-h${hi}-l${li}`;
}

/** Read a line element's `data-diff-*` attributes back into a SelectionEnd. */
function endFromLineEl(el: HTMLElement): SelectionEnd | null {
  const seq = Number(el.getAttribute(DIFF_ATTR.seq) ?? "-1");
  const side = (el.getAttribute(DIFF_ATTR.side) as CommentSide | null) ?? undefined;
  if (seq < 0 || !side) return null;
  const oldS = el.getAttribute(DIFF_ATTR.oldLine) ?? "";
  const newS = el.getAttribute(DIFF_ATTR.newLine) ?? "";
  return {
    side,
    ref: {
      oldLineNo: oldS === "" ? null : Number(oldS),
      newLineNo: newS === "" ? null : Number(newS),
    },
    seq,
  };
}

export default function DiffView({ files, comments, onComment }: DiffViewProps) {
  const { t } = useTranslation(I18nNamespace.PRS);

  // Files to collapse on first render of a given diff (large files + everything
  // past the cumulative budget). Recomputed only when `files` changes.
  const defaultCollapsed = useMemo(() => {
    const set = new Set<string>();
    let cumulative = 0;
    for (const file of files) {
      const lines = lineCountOf(file);
      if (lines > MAX_FILE_LINES || cumulative >= MAX_TOTAL_LINES) set.add(file.path);
      else cumulative += lines;
    }
    return set;
  }, [files]);

  const [collapsed, setCollapsed] = useState<Set<string>>(defaultCollapsed);
  // Re-seed the collapse state whenever the diff itself changes (new PR /
  // reload). `files` keeps a stable reference from the store within one diff, so
  // a user's manual expand/collapse persists until the diff actually reloads.
  const seededFilesRef = useRef(files);
  useEffect(() => {
    if (seededFilesRef.current !== files) {
      seededFilesRef.current = files;
      setCollapsed(defaultCollapsed);
    }
  }, [files, defaultCollapsed]);
  // `dragging` only gates the window listeners + `user-select`. The live range
  // is kept in a ref and painted via DOM attributes so sweeping across a large
  // diff never re-renders React. `composeSel` is set once on release, to render
  // the composer at the range end.
  const [dragging, setDragging] = useState(false);
  const [composeSel, setComposeSel] = useState<Selection | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Selection | null>(null);
  const seqMapRef = useRef<Map<number, HTMLElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  // Mirrors of state for stable callbacks that must read the latest value
  // without being re-created (which would re-render every memoised row).
  const composeSelRef = useRef<Selection | null>(null);
  composeSelRef.current = composeSel;
  const draggingRef = useRef(false);
  draggingRef.current = dragging;

  type PaintAttr = typeof DIFF_ATTR.selected | typeof DIFF_ATTR.highlight;
  const paintRange = useCallback((lo: number, hi: number, attr: PaintAttr = DIFF_ATTR.selected) => {
    for (const [seq, el] of seqMapRef.current) {
      if (seq >= lo && seq <= hi) el.setAttribute(attr, "");
      else el.removeAttribute(attr);
    }
  }, []);

  const clearPaint = useCallback((attr?: PaintAttr) => {
    const sel = attr ? `[${attr}]` : `[${DIFF_ATTR.selected}],[${DIFF_ATTR.highlight}]`;
    rootRef.current?.querySelectorAll(sel).forEach((el) => {
      el.removeAttribute(DIFF_ATTR.selected);
      el.removeAttribute(DIFF_ATTR.highlight);
    });
  }, []);

  // Snapshot seq → element (the nodes persist for the interaction's lifetime).
  const buildSeqMap = useCallback(() => {
    const map = new Map<number, HTMLElement>();
    rootRef.current
      ?.querySelectorAll<HTMLElement>(`[data-testid="${TEST_IDS.mr.diff.line}"]`)
      .forEach((el) => {
        const s = Number(el.getAttribute(DIFF_ATTR.seq) ?? "-1");
        if (s >= 0) map.set(s, el);
      });
    seqMapRef.current = map;
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    clearPaint();
    dragRef.current = null;
    setComposeSel(null);
    setDragging(false);
  }, [clearPaint]);

  useEffect(() => {
    if (!dragging) return;
    const scheduleApply = () => {
      const apply = () => {
        rafRef.current = null;
        const d = dragRef.current;
        if (d) paintRange(Math.min(d.anchor.seq, d.head.seq), Math.max(d.anchor.seq, d.head.seq));
      };
      if (typeof requestAnimationFrame !== "function") {
        apply();
        return;
      }
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(apply);
    };
    // The browser captures all mouse events to the press target while a button
    // is held, so per-line `onMouseEnter` never fires. Hit-test the cursor
    // against the line under it on each move instead, and extend the live range
    // — across sides if needed (a range may run from a deletion to an addition).
    const onMove = (e: globalThis.MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const lineEl = el?.closest<HTMLElement>(`[data-testid="${TEST_IDS.mr.diff.line}"]`);
      if (!lineEl || lineEl.getAttribute(DIFF_ATTR.path) !== d.path) return;
      const head = endFromLineEl(lineEl);
      if (!head || head.seq === d.head.seq) return;
      d.head = head;
      scheduleApply();
    };
    const onUp = () => {
      const d = dragRef.current;
      setDragging(false);
      // Keep the painted band; open the composer at the range end.
      if (d) setComposeSel({ path: d.path, anchor: d.anchor, head: d.head });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, paintRange]);

  // Split comments into line-anchored (rendered next to their line) and
  // unanchored (general/legacy comments with no position → file footer).
  const { anchoredComments, footerComments } = useMemo(() => {
    const anchored = new Map<string, Comment[]>();
    const footer = new Map<string, Comment[]>();
    for (const c of comments ?? []) {
      if (!c.path) continue;
      if (c.side && c.line != null) {
        const k = anchorKey(c.path, c.side, c.line);
        const arr = anchored.get(k) ?? [];
        arr.push(c);
        anchored.set(k, arr);
      } else {
        const arr = footer.get(c.path) ?? [];
        arr.push(c);
        footer.set(c.path, arr);
      }
    }
    return { anchoredComments: anchored, footerComments: footer };
  }, [comments]);

  // Per-line render data (stable across renders unless `files` change) + the
  // seqs covered by a posted comment's range + each comment's seq range.
  const { rowData, coveredSeqs, commentRanges } = useMemo(() => {
    const data = new Map<string, RowMeta>();
    const meta: { path: string; side: CommentSide; num: number; seq: number }[] = [];
    let seq = 0;
    files.forEach((file) => {
      file.hunks.forEach((hunk, hi) => {
        const refs = resolveHunkRefs(hunk);
        hunk.lines.forEach((line, li) => {
          const ref = refs[li] ?? { oldLineNo: line.oldLineNo, newLineNo: line.newLineNo };
          const side = lineSide(line.newLineNo);
          const num = sideNo(ref, side);
          data.set(rowKey(file.path, hi, li), { ref, side, num, seq });
          meta.push({ path: file.path, side, num, seq });
          seq += 1;
        });
      });
    });
    const seqOf = (path: string, side: CommentSide, num: number) =>
      meta.find((m) => m.path === path && m.side === side && m.num === num)?.seq;
    const covered = new Set<number>();
    const ranges = new Map<string, [number, number]>();
    for (const c of comments ?? []) {
      if (!c.path || c.line == null || !c.side) continue;
      const endSeq = seqOf(c.path, c.side, c.line);
      if (endSeq == null) continue;
      const startSeq =
        c.startLine != null && c.startSide
          ? (seqOf(c.path, c.startSide, c.startLine) ?? endSeq)
          : endSeq;
      const lo = Math.min(startSeq, endSeq);
      const hi = Math.max(startSeq, endSeq);
      ranges.set(c.id, [lo, hi]);
      for (let s = lo; s <= hi; s += 1) covered.add(s);
    }
    return { rowData: data, coveredSeqs: covered, commentRanges: ranges };
  }, [files, comments]);

  const toggle = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Mouse-down on a line's affordance begins a drag-selection anchored there.
  const startDrag = useCallback(
    (e: MouseEvent, path: string, end: SelectionEnd) => {
      e.preventDefault(); // don't begin a native text selection while dragging
      setComposeSel(null);
      buildSeqMap();
      dragRef.current = { path, anchor: end, head: end };
      clearPaint();
      paintRange(end.seq, end.seq);
      setDragging(true);
    },
    [buildSeqMap, clearPaint, paintRange],
  );

  const submit = useCallback(
    async (body: string) => {
      const sel = composeSelRef.current;
      if (!sel || !onComment) return;
      // Order the two ends by diff position so `start` precedes `end` even when
      // the range crosses sides.
      const [first, last] =
        sel.anchor.seq <= sel.head.seq ? [sel.anchor, sel.head] : [sel.head, sel.anchor];
      const single = first.seq === last.seq;
      const toAnchor = (e: SelectionEnd): CommentAnchor => ({
        side: e.side,
        oldLineNo: e.ref.oldLineNo,
        newLineNo: e.ref.newLineNo,
      });
      await onComment(
        sel.path,
        { start: single ? null : toAnchor(first), end: toAnchor(last) },
        body,
      );
      reset();
    },
    [onComment, reset],
  );

  // Hovering a posted comment card paints its covered lines as a gentle tint so
  // you can see exactly which lines it refers to. Skipped mid-drag.
  const onCommentHover = useCallback(
    (id: string) => {
      if (draggingRef.current) return;
      const range = commentRanges.get(id);
      if (!range) return;
      buildSeqMap();
      paintRange(range[0], range[1], DIFF_ATTR.highlight);
    },
    [commentRanges, buildSeqMap, paintRange],
  );
  const onCommentLeave = useCallback(() => {
    if (!draggingRef.current) clearPaint(DIFF_ATTR.highlight);
  }, [clearPaint]);

  if (files.length === 0) {
    return <Empty>{t("diff.empty")}</Empty>;
  }

  const composerSeq =
    composeSel != null ? Math.max(composeSel.anchor.seq, composeSel.head.seq) : -1;

  return (
    <Root ref={rootRef} style={{ userSelect: dragging ? "none" : undefined }}>
      {files.map((file) => {
        const isCollapsed = collapsed.has(file.path);
        const footer = footerComments.get(file.path) ?? NO_COMMENTS;
        return (
          <FileBlock key={file.path} data-testid={TEST_IDS.mr.diff.file}>
            <FileHeader
              type="button"
              onClick={() => toggle(file.path)}
              data-testid={TEST_IDS.mr.diff.fileToggle}
            >
              {isCollapsed ? (
                <ChevronRight size={pxToRem(14)} />
              ) : (
                <ChevronDown size={pxToRem(14)} />
              )}
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
                        const meta = rowData.get(rowKey(file.path, hi, li));
                        const seq = meta?.seq ?? -1;
                        const side = meta?.side ?? lineSide(line.newLineNo);
                        const ref = meta?.ref ?? {
                          oldLineNo: line.oldLineNo,
                          newLineNo: line.newLineNo,
                        };
                        const num = meta?.num ?? 0;
                        const selected = coveredSeqs.has(seq);
                        return (
                          <DiffRow
                            key={rowKey(file.path, hi, li)}
                            path={file.path}
                            line={line}
                            lineRef={ref}
                            side={side}
                            seq={seq}
                            canComment={onComment != null && num > 0}
                            selected={selected}
                            selTop={selected && !coveredSeqs.has(seq - 1)}
                            selBottom={selected && !coveredSeqs.has(seq + 1)}
                            isComposerLine={
                              composeSel != null &&
                              composeSel.path === file.path &&
                              seq === composerSeq
                            }
                            anchored={
                              anchoredComments.get(anchorKey(file.path, side, num)) ?? NO_COMMENTS
                            }
                            onStartDrag={startDrag}
                            onSubmit={submit}
                            onCancel={reset}
                            onCommentHover={onCommentHover}
                            onCommentLeave={onCommentLeave}
                          />
                        );
                      })}
                    </Lines>
                  </Box>
                ))
              ))}

            {!isCollapsed &&
              footer.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onMouseEnter={() => onCommentHover(c.id)}
                  onMouseLeave={onCommentLeave}
                />
              ))}
          </FileBlock>
        );
      })}
    </Root>
  );
}
