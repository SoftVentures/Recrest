import { type ComponentProps } from "react";

import ReactMarkdown from "react-markdown";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import rehypeRaw from "rehype-raw";
import rehypeSanitize, { type Options as SanitizeOptions, defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

interface MarkdownViewProps {
  /** Provider-supplied markdown. May contain raw HTML (`<details>`, etc.) —
   *  it's sanitised against the rehype default schema before render. */
  source: string;
  className?: string;
}

/** Sanitiser schema: start from the default safe set and additively allow the
 *  HTML constructs PR descriptions actually use in the wild (`<details>` /
 *  `<summary>` from Dependabot, table alignment attrs, code highlight class
 *  names). Anything not on this list — `<script>`, event handlers, `style` —
 *  is stripped. */
const SCHEMA: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    "*": [...((defaultSchema.attributes ?? {})["*"] ?? []), "className"],
    details: ["open"],
    th: ["align"],
    td: ["align"],
    code: ["className"],
  },
};

const REMARK = [remarkGfm];
const REHYPE = [rehypeRaw, [rehypeSanitize, SCHEMA]] as ComponentProps<
  typeof ReactMarkdown
>["rehypePlugins"];

/** Renders GitHub-flavoured Markdown (tables, autolinks, task lists, fenced
 *  code) plus a tightly-allowlisted subset of inline HTML so Dependabot
 *  release-notes (which embed `<details>` / `<summary>`) render correctly. */
function MarkdownView({ source, className }: MarkdownViewProps) {
  return (
    <Root className={className}>
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE}>
        {source}
      </ReactMarkdown>
    </Root>
  );
}

const Root = styled(Box)(({ theme }) => ({
  fontSize: 13,
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  wordBreak: "break-word",

  "& > *:first-of-type": { marginTop: 0 },
  "& > *:last-child": { marginBottom: 0 },

  "& p": { margin: "0 0 10px" },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    margin: "16px 0 8px",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  "& h1": { fontSize: 18 },
  "& h2": { fontSize: 16 },
  "& h3": { fontSize: 14 },
  "& h4, & h5, & h6": { fontSize: 13 },

  "& a": {
    color: theme.palette.primary.main,
    textDecoration: "underline",
    textUnderlineOffset: 2,
    "&:hover": { textDecoration: "none" },
  },

  // List markers sit in the padding area (default `list-style-position:
  // outside`), so the visible indent IS the padding-inline-start. 28px
  // leaves a comfortable gap between bullet glyph and the surrounding text.
  "& ul, & ol": { margin: "0 0 10px", paddingLeft: 28 },
  // Nested lists indent further so a tree of bullets stays visually scannable.
  "& ul ul, & ul ol, & ol ul, & ol ol": { margin: "4px 0", paddingLeft: 24 },
  "& li": { margin: "2px 0", paddingLeft: 2 },
  // GitHub-flavoured markdown wraps each list item's content in <p> — collapse
  // that wrapper margin so list items don't get bonus spacing on every line.
  "& li > p": { margin: 0 },
  "& li > input[type='checkbox']": { marginRight: 6 },

  "& code": {
    fontFamily: MONO,
    fontSize: 12,
    padding: "1px 5px",
    borderRadius: 4,
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.primary,
  },
  "& pre": {
    margin: "0 0 10px",
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.palette.surface.interface.backElevation,
    border: `1px solid ${theme.palette.divider}`,
    overflowX: "auto",
    fontSize: 12,
    lineHeight: 1.5,
  },
  "& pre code": {
    padding: 0,
    backgroundColor: "transparent",
    fontSize: "inherit",
  },

  "& blockquote": {
    margin: "0 0 10px",
    padding: "4px 12px",
    borderLeft: `3px solid ${theme.palette.divider}`,
    color: theme.palette.text.information,
  },

  "& hr": {
    border: "none",
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: "16px 0",
  },

  "& table": {
    borderCollapse: "collapse",
    width: "100%",
    margin: "0 0 10px",
    fontSize: 12.5,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  "& thead": { backgroundColor: theme.palette.surface.interface.backElevation },
  "& th, & td": {
    padding: "6px 10px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    textAlign: "left",
    verticalAlign: "top",
  },
  "& tr:last-child td": { borderBottom: "none" },

  "& details": {
    margin: "0 0 10px",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    backgroundColor: theme.palette.surface.interface.base,
    overflow: "hidden",
    "& > summary": {
      padding: "8px 12px",
      cursor: "pointer",
      fontWeight: 600,
      listStyle: "none",
      backgroundColor: theme.palette.surface.interface.backElevation,
      borderBottom: `1px solid ${theme.palette.divider}`,
      "&::-webkit-details-marker": { display: "none" },
      "&::marker": { display: "none" },
      "&::before": { content: '"▸ "', marginRight: 4 },
    },
    "&[open] > summary::before": { content: '"▾ "' },
    "& > *:not(summary)": { padding: "10px 14px" },
    // Direct-child lists inside <details> get their own padding-left so the
    // bullet markers don't collapse onto the inner-padding edge. The
    // 14px inner padding + 28px list indent gives bullets the same visible
    // offset as top-level lists.
    "& > ul, & > ol": { padding: "10px 14px", paddingLeft: 42 },
  },

  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: 8,
  },
})) as typeof Box;

export default MarkdownView;
