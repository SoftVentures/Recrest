// Defense-in-depth HTML sanitizer wrapping DOMPurify. Use this whenever a
// user-supplied or provider-supplied HTML string is about to enter the DOM
// outside of a vetted pipeline like `MarkdownView` (which already runs
// rehype-sanitize internally).
//
// Two main consumers today:
//  1. Rich-text editors (TipTap) — clean pasted-HTML before the editor
//     parses it, so weird inline HTML never even makes it into the doc.
//  2. Any future `dangerouslySetInnerHTML` call site (avoid one if you can —
//     prefer `MarkdownView` or composed React nodes).
//
// Config: allow a focused safe set that mirrors `MarkdownView`'s rehype
// schema (text + tables + collapsible details + code, no scripts/iframes/
// styles/event handlers).
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "del",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "details",
  "summary",
  "hr",
  "span",
  "div",
];

const ALLOWED_ATTRS = [
  "href",
  "src",
  "alt",
  "title",
  "open",
  "align",
  "class",
  "colspan",
  "rowspan",
];

/** Returns a sanitised copy of the supplied HTML string. Strips `<script>`,
 *  `<iframe>`, all `on*` event handlers, `style` attributes, `javascript:`
 *  URLs, and any tag/attribute outside the allowlist. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    // FORBID_ATTR is implicit via ALLOWED_ATTR, but spell out the high-risk
    // ones so a future "ALLOWED_ATTR additions" PR doesn't accidentally
    // reintroduce them.
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover"],
    // Inline HTML always renders as a fragment — never as a full document.
    RETURN_TRUSTED_TYPE: false,
  });
}
