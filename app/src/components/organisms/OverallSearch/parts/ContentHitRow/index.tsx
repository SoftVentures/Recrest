import { type ReactNode } from "react";

import { File as FileIcon } from "lucide-react";

import {
  ContentLineNo,
  ContentPath,
  ContentRow,
  ContentSnippet,
  ContentTop,
  SnippetMark,
} from "@/components/organisms/OverallSearch/OverallSearch.styles";

export interface ContentHitRowProps {
  path: string;
  line: number;
  snippet: string;
  /** Current query, highlighted within the snippet. */
  query: string;
  active: boolean;
  testId: string;
  onMouseEnter: () => void;
  onClick: () => void;
}

/** Wrap each case-insensitive occurrence of `query` in the snippet so the match
 *  stands out, the way the old find-across dialog did. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: ReactNode[] = [];
  let cursor = 0;
  let idx = lower.indexOf(needle, cursor);
  while (idx !== -1) {
    if (idx > cursor) out.push(text.slice(cursor, idx));
    out.push(<SnippetMark key={idx}>{text.slice(idx, idx + needle.length)}</SnippetMark>);
    cursor = idx + needle.length;
    idx = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export default function ContentHitRow({
  path,
  line,
  snippet,
  query,
  active,
  testId,
  onMouseEnter,
  onClick,
}: ContentHitRowProps) {
  return (
    <ContentRow
      type="button"
      active={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      data-testid={testId}
    >
      <ContentTop>
        <FileIcon size={13} aria-hidden />
        <ContentPath component="span" variant="caption">
          {path}
        </ContentPath>
        <ContentLineNo component="span" variant="caption">
          L{line}
        </ContentLineNo>
      </ContentTop>
      <ContentSnippet component="span" variant="caption">
        {highlight(snippet, query)}
      </ContentSnippet>
    </ContentRow>
  );
}
