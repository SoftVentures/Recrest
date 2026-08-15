import { type ComponentProps } from "react";

import ReactMarkdown from "react-markdown";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import rehypeRaw from "rehype-raw";
import rehypeSanitize, { type Options as SanitizeOptions, defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const MONO = MONO_STACK;

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
  fontSize: fontPxToRem(13),
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  wordBreak: "break-word",

  "& > *:first-of-type": { marginTop: 0 },
  "& > *:last-child": { marginBottom: 0 },

  "& p": { margin: pxToRems(0, 0, 10) },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    margin: pxToRems(16, 0, 8),
    fontWeight: 700,
    lineHeight: 1.3,
  },
  "& h1": { fontSize: fontPxToRem(18) },
  "& h2": { fontSize: fontPxToRem(16) },
  "& h3": { fontSize: fontPxToRem(14) },
  "& h4, & h5, & h6": { fontSize: fontPxToRem(13) },

  "& a": {
    color: theme.palette.primary.main,
    textDecoration: "underline",
    textUnderlineOffset: 2,
    "&:hover": { textDecoration: "none" },
  },

  // List markers sit in the padding area (default `list-style-position:
  // outside`), so the visible indent IS the padding-inline-start. 28px
  // leaves a comfortable gap between bullet glyph and the surrounding text.
  "& ul, & ol": { margin: pxToRems(0, 0, 10), paddingLeft: pxToRem(28) },
  // Nested lists indent further so a tree of bullets stays visually scannable.
  "& ul ul, & ul ol, & ol ul, & ol ol": { margin: pxToRems(4, 0), paddingLeft: pxToRem(24) },
  "& li": { margin: pxToRems(2, 0), paddingLeft: pxToRem(2) },
  // GitHub-flavoured markdown wraps each list item's content in <p> — collapse
  // that wrapper margin so list items don't get bonus spacing on every line.
  "& li > p": { margin: 0 },
  "& li > input[type='checkbox']": { marginRight: pxToRem(6) },

  "& code": {
    fontFamily: MONO,
    fontFeatureSettings: CODE_LIGATURES,
    fontSize: fontPxToRem(12),
    padding: pxToRems(1, 5),
    borderRadius: 4,
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.primary,
  },
  "& pre": {
    margin: pxToRems(0, 0, 10),
    padding: pxToRem(12),
    borderRadius: 8,
    backgroundColor: theme.palette.surface.interface.backElevation,
    border: `1px solid ${theme.palette.divider}`,
    overflowX: "auto",
    fontSize: fontPxToRem(12),
    lineHeight: 1.5,
  },
  "& pre code": {
    padding: 0,
    backgroundColor: "transparent",
    fontSize: "inherit",
  },

  "& blockquote": {
    margin: pxToRems(0, 0, 10),
    padding: pxToRems(4, 12),
    borderLeft: `3px solid ${theme.palette.divider}`,
    color: theme.palette.text.information,
  },

  "& hr": {
    border: "none",
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: pxToRems(16, 0),
  },

  "& table": {
    borderCollapse: "collapse",
    width: "100%",
    margin: pxToRems(0, 0, 10),
    fontSize: fontPxToRem(12.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  "& thead": { backgroundColor: theme.palette.surface.interface.backElevation },
  "& th, & td": {
    padding: pxToRems(6, 10),
    borderBottom: `1px solid ${theme.palette.divider}`,
    textAlign: "left",
    verticalAlign: "top",
  },
  "& tr:last-child td": { borderBottom: "none" },

  "& details": {
    margin: pxToRems(0, 0, 10),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    backgroundColor: theme.palette.surface.interface.base,
    overflow: "hidden",
    "& > summary": {
      padding: pxToRems(8, 12),
      cursor: "pointer",
      fontWeight: 600,
      listStyle: "none",
      backgroundColor: theme.palette.surface.interface.backElevation,
      borderBottom: `1px solid ${theme.palette.divider}`,
      "&::-webkit-details-marker": { display: "none" },
      "&::marker": { display: "none" },
      "&::before": { content: '"▸ "', marginRight: pxToRem(4) },
    },
    "&[open] > summary::before": { content: '"▾ "' },
    "& > *:not(summary)": { padding: pxToRems(10, 14) },
    // Direct-child lists inside <details> get their own padding-left so the
    // bullet markers don't collapse onto the inner-padding edge. The
    // 14px inner padding + 28px list indent gives bullets the same visible
    // offset as top-level lists.
    "& > ul, & > ol": { padding: pxToRems(10, 14), paddingLeft: pxToRem(42) },
  },

  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: 8,
  },
})) as typeof Box;

export default MarkdownView;
